"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { generateCard } from "@/lib/bingo/card";
import { findCompletedLines, lineNumbers } from "@/lib/bingo/lines";
import { shuffle75, completingIndex } from "@/lib/bingo/draw-order";
import { computeCommitHash, randomSalt, verifyCommitHash } from "@/lib/bingo/commit";
import type { BingoMessage } from "@/types/bingo-realtime";
import type { BingoCard, BingoLineRef, BingoPhase, BingoRoundResult, BingoWinner } from "@/types/bingo";

interface UseBingoSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

type Side = "host" | "guest";

// Qui appelle les numéros cette manche — pure fonction de la parité de
// l'index, jamais transmise (même principe que `drawerIsInitiatorForRound`
// de Doodle Duel). Gouverne UNIQUEMENT qui génère/rythme le tirage — jamais
// qui a le droit de marquer sa carte ou de réclamer une ligne, qui ne sont
// JAMAIS soumis à un tour (voir CLAUDE.md "Bingo").
function callerIsInitiatorForRound(round: number): boolean {
  return round % 2 === 0;
}

interface PendingClaim {
  side: Side;
  line: BingoLineRef;
  completingIndex: number;
}

// Orchestration d'une partie Bingo : chaque manche, un·e seul·e donne les
// numéros (rôle alterné), les deux marquent leur propre carte privée et
// tentent de réclamer une ligne — jamais de tour, jamais d'attente de
// l'autre. Schéma d'engagement puis révélation pour empêcher le·la
// donneur·se de biaiser silencieusement l'ordre de tirage en faveur de sa
// propre carte (voir lib/bingo/commit.ts). Aucune autorité unique ne décide
// qui a gagné une réclamation : les deux côtés revalident indépendamment
// contre le MÊME journal partagé de numéros appelés.
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour à côté du state correspondant.
export function useBingoSession({ dataChannel, isInitiator }: UseBingoSessionOptions) {
  const mySide: Side = isInitiator ? "host" : "guest";

  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<BingoPhase>("lobby");
  const [round, setRound] = useState(0);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [claimArmed, setClaimArmed] = useState(false);
  const [myClaimSubmitted, setMyClaimSubmitted] = useState(false);
  const [result, setResult] = useState<BingoRoundResult | null>(null);
  const [fairnessFailed, setFairnessFailed] = useState(false);
  const [scores, setScores] = useState({ host: 0, guest: 0, draws: 0 });
  const [rounds, setRounds] = useState<BingoRoundResult[]>([]);

  const roundRef = useRef(0);
  const cardRef = useRef<BingoCard | null>(null);
  const calledNumbersRef = useRef<number[]>([]);
  const advancedToRef = useRef(-1);
  const resultAppliedRef = useRef(false);
  const myClaimSubmittedRef = useRef(false);
  const pendingClaimsRef = useRef<Partial<Record<Side, PendingClaim>>>({});
  const scoresRef = useRef({ host: 0, guest: 0, draws: 0 });
  const roundsRef = useRef<BingoRoundResult[]>([]);
  const drawSequenceRef = useRef<number[]>([]);
  const saltRef = useRef("");
  const commitHashRef = useRef<string | null>(null);
  const callIndexRef = useRef(0);
  const callIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const claimGraceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function send(message: BingoMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  function clearRoundTimers() {
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
      callIntervalRef.current = null;
    }
    if (claimGraceTimeoutRef.current) {
      clearTimeout(claimGraceTimeoutRef.current);
      claimGraceTimeoutRef.current = null;
    }
  }

  // Réinitialise l'état d'une manche — appelée par les DEUX côtés à chaque
  // manche, chacun régénère sa PROPRE carte localement (jamais transmise,
  // voir lib/bingo/card.ts). Seul·e le·la donneur·se de CETTE manche
  // enchaîne ensuite sur le tirage (voir applyAdvance).
  function beginRound(targetRound: number) {
    clearRoundTimers();
    roundRef.current = targetRound;
    setRound(targetRound);
    cardRef.current = generateCard();
    setCard(cardRef.current);
    calledNumbersRef.current = [];
    setCalledNumbers([]);
    setCurrentNumber(null);
    myClaimSubmittedRef.current = false;
    setMyClaimSubmitted(false);
    setClaimArmed(false);
    pendingClaimsRef.current = {};
    resultAppliedRef.current = false;
    setResult(null);
    setFairnessFailed(false);
    commitHashRef.current = null;
    drawSequenceRef.current = [];
    callIndexRef.current = 0;
    setPhase("calling");
  }

  async function startCalling(targetRound: number) {
    const sequence = shuffle75();
    const salt = randomSalt();
    drawSequenceRef.current = sequence;
    saltRef.current = salt;
    const commitHash = await computeCommitHash(salt, sequence);
    send({ t: "bingo-draw-commit", round: targetRound, commitHash });

    callIntervalRef.current = setInterval(() => {
      if (roundRef.current !== targetRound || resultAppliedRef.current) {
        clearRoundTimers();
        return;
      }
      if (callIndexRef.current >= sequence.length) {
        clearRoundTimers();
        return; // 75 numéros épuisés sans ligne complète — formalité quasi jamais atteinte
      }
      const index = callIndexRef.current;
      const number = sequence[index];
      callIndexRef.current += 1;
      send({ t: "bingo-number-called", round: targetRound, index, number });
      applyCalledNumber(targetRound, number);
    }, config.bingo.callIntervalMs);
  }

  function applyCalledNumber(targetRound: number, number: number) {
    if (targetRound !== roundRef.current) return;
    calledNumbersRef.current = [...calledNumbersRef.current, number];
    setCalledNumbers(calledNumbersRef.current);
    setCurrentNumber(number);
    if (cardRef.current && findCompletedLines(cardRef.current, new Set(calledNumbersRef.current)).length > 0) {
      setClaimArmed(true);
    }
  }

  // Fait à la fois "lancer la manche 0" et "manche suivante" — gardé par la
  // cible elle-même (comparée à la dernière déjà appliquée), même principe
  // que les autres jeux à manches de ce hub.
  function applyAdvance(targetRound: number) {
    if (targetRound <= advancedToRef.current) return;
    advancedToRef.current = targetRound;
    setHasStarted(true);
    if (targetRound >= config.bingo.rounds) {
      setPhase("recap");
      return;
    }
    beginRound(targetRound);
    if (callerIsInitiatorForRound(targetRound) === isInitiator) {
      startCalling(targetRound);
    }
  }

  // Ni le·la donneur·se ni personne d'autre ne "décide" qui a gagné une
  // réclamation — chaque côté la revalide indépendamment contre son PROPRE
  // journal de numéros appelés (identique des deux côtés par construction).
  // Une fenêtre de grâce laisse une seconde réclamation quasi simultanée
  // arriver avant de trancher, pour ne jamais couronner injustement qui a
  // cliqué en premier plutôt que qui a complété sa ligne en premier dans
  // l'ordre de tirage partagé (voir CLAUDE.md "Bingo").
  function evaluateClaim(side: Side, line: BingoLineRef, numbers: number[]) {
    if (resultAppliedRef.current) return;
    const index = completingIndex(calledNumbersRef.current, numbers);
    if (index === -1) return; // réclamation invalide — silencieusement ignorée
    pendingClaimsRef.current[side] = { side, line, completingIndex: index };

    const host = pendingClaimsRef.current.host;
    const guest = pendingClaimsRef.current.guest;
    if (host && guest) {
      if (claimGraceTimeoutRef.current) {
        clearTimeout(claimGraceTimeoutRef.current);
        claimGraceTimeoutRef.current = null;
      }
      resolveClaims();
    } else if (!claimGraceTimeoutRef.current) {
      claimGraceTimeoutRef.current = setTimeout(() => {
        claimGraceTimeoutRef.current = null;
        resolveClaims();
      }, config.bingo.claimGraceMs);
    }
  }

  function resolveClaims() {
    if (resultAppliedRef.current) return;
    const host = pendingClaimsRef.current.host;
    const guest = pendingClaimsRef.current.guest;
    if (!host && !guest) return;

    let winner: BingoWinner;
    let winningLine: BingoLineRef;
    if (host && guest) {
      if (host.completingIndex < guest.completingIndex) {
        winner = "host";
        winningLine = host.line;
      } else if (guest.completingIndex < host.completingIndex) {
        winner = "guest";
        winningLine = guest.line;
      } else {
        winner = "draw";
        winningLine = host.line;
      }
    } else if (host) {
      winner = "host";
      winningLine = host.line;
    } else {
      winner = "guest";
      winningLine = guest!.line;
    }

    applyResult({ round: roundRef.current, winner, lineType: winningLine.type, lineIndex: winningLine.index });
  }

  function applyResult(roundResult: BingoRoundResult) {
    if (resultAppliedRef.current) return;
    resultAppliedRef.current = true;
    clearRoundTimers();
    setResult(roundResult);
    setPhase("reveal");
    scoresRef.current = {
      host: scoresRef.current.host + (roundResult.winner === "host" ? 1 : 0),
      guest: scoresRef.current.guest + (roundResult.winner === "guest" ? 1 : 0),
      draws: scoresRef.current.draws + (roundResult.winner === "draw" ? 1 : 0),
    };
    setScores(scoresRef.current);
    roundsRef.current = [...roundsRef.current, roundResult];
    setRounds(roundsRef.current);

    if (callerIsInitiatorForRound(roundResult.round) === isInitiator) {
      send({ t: "bingo-draw-reveal", round: roundResult.round, salt: saltRef.current, fullSequence: drawSequenceRef.current });
    }
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as BingoMessage;

      if (message.t === "bingo-advance") {
        applyAdvance(message.round);
      } else if (message.t === "bingo-draw-commit") {
        if (message.round !== roundRef.current) return;
        commitHashRef.current = message.commitHash;
      } else if (message.t === "bingo-number-called") {
        applyCalledNumber(message.round, message.number);
      } else if (message.t === "bingo-claim") {
        if (message.round !== roundRef.current) return;
        // Le seul message de ce type que JE reçois vient forcément de
        // l'autre côté (on ne reçoit jamais son propre envoi) — pas besoin
        // de distinguer explicitement qui l'a envoyé.
        const peerSide: Side = isInitiator ? "guest" : "host";
        evaluateClaim(peerSide, message.line, message.lineNumbers);
      } else if (message.t === "bingo-draw-reveal") {
        if (message.round !== roundRef.current) return;
        if (callerIsInitiatorForRound(message.round) === isInitiator) return; // le·la donneur·se ne se revérifie pas lui/elle-même
        const expectedHash = commitHashRef.current;
        if (!expectedHash) return;
        const calledSoFar = calledNumbersRef.current;
        verifyCommitHash(message.salt, message.fullSequence, expectedHash).then((hashOk) => {
          const prefixOk = message.fullSequence.slice(0, calledSoFar.length).every((value, index) => value === calledSoFar[index]);
          if (!hashOk || !prefixOk) {
            setFairnessFailed(true);
            console.warn('Bingo : vérification d\'équité échouée (voir CLAUDE.md "Bingo")', { hashOk, prefixOk, round: message.round });
          }
        });
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  useEffect(() => clearRoundTimers, []);

  // Lancement (hôte uniquement, voir BingoLobby.tsx) — ce clic humain
  // explicite offre la même marge de sécurité qu'un hello one-shot (voir
  // types/bingo-realtime.ts), sans jamais avoir besoin de renvoi
  // périodique comme uttt-ready.
  function launch() {
    advancedToRef.current = -1;
    scoresRef.current = { host: 0, guest: 0, draws: 0 };
    setScores(scoresRef.current);
    roundsRef.current = [];
    setRounds([]);
    send({ t: "bingo-advance", round: 0 });
    applyAdvance(0);
  }

  // Réclame une ligne dès qu'elle est armée (voir applyCalledNumber) —
  // jamais soumis à un tour, n'importe quel côté peut réclamer l'instant où
  // sa propre carte le permet.
  function claim() {
    if (myClaimSubmittedRef.current || !cardRef.current) return;
    const completed = findCompletedLines(cardRef.current, new Set(calledNumbersRef.current));
    if (completed.length === 0) return;
    const line: BingoLineRef = { type: completed[0].type, index: completed[0].index };
    const numbers = lineNumbers(cardRef.current, line);
    myClaimSubmittedRef.current = true;
    setMyClaimSubmitted(true);
    send({ t: "bingo-claim", round: roundRef.current, line, lineNumbers: numbers });
    evaluateClaim(mySide, line, numbers);
  }

  // "Manche suivante"/"Voir le récap" — n'importe quel côté peut cliquer.
  function continueAfterReveal() {
    const target = roundRef.current + 1;
    send({ t: "bingo-advance", round: target });
    applyAdvance(target);
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger ni renégocier WebRTC. L'hôte doit relancer explicitement
  // (voir launch()).
  function replay() {
    clearRoundTimers();
    setHasStarted(false);
    advancedToRef.current = -1;
    roundRef.current = 0;
    setRound(0);
    roundsRef.current = [];
    setRounds([]);
    scoresRef.current = { host: 0, guest: 0, draws: 0 };
    setScores(scoresRef.current);
    cardRef.current = null;
    setCard(null);
    calledNumbersRef.current = [];
    setCalledNumbers([]);
    setCurrentNumber(null);
    setClaimArmed(false);
    myClaimSubmittedRef.current = false;
    setMyClaimSubmitted(false);
    setResult(null);
    setFairnessFailed(false);
    setPhase("lobby");
  }

  return {
    hasStarted,
    phase,
    round,
    totalRounds: config.bingo.rounds,
    mySide,
    card,
    calledNumbers,
    currentNumber,
    claimArmed,
    myClaimSubmitted,
    result,
    fairnessFailed,
    scores,
    rounds,
    launch,
    claim,
    continueAfterReveal,
    replay,
  };
}

export type UseBingoSessionReturn = ReturnType<typeof useBingoSession>;
