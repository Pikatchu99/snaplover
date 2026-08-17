"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { computeRevealDelay, computeSample } from "@/lib/reflex-match/clock-sync";
import { generateRound } from "@/lib/reflex-match/generate-round";
import type { ReflexMatchMessage } from "@/types/reflex-match-realtime";
import type { ReflexPhase, ReflexRound, ReflexRoundResult, ReflexWinner } from "@/types/reflex-match";

interface UseReflexMatchSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

type Side = "host" | "guest";

// Qui a l'autorité de manche — pure fonction de la parité de l'index,
// jamais transmise (même principe que `drawerIsInitiatorForRound` de
// Doodle Duel). Gouverne UNIQUEMENT qui tire la graine et arbitre le
// résultat — jamais qui a le droit de taper : taper n'est jamais soumis à
// un tour (voir CLAUDE.md "Reflex Match").
function authorityIsInitiatorForRound(round: number): boolean {
  return round % 2 === 0;
}

// Orchestration d'une partie Reflex Match : à chaque manche, une grille 3x3
// identique révélée au MÊME instant des deux côtés (horloge synchronisée),
// course libre pour taper la case impaire en premier. AUCUNE information
// cachée une fois la graine connue — les deux côtés font tourner la même
// fonction pure generateRound() — mais une vraie fenêtre de course dans le
// temps à arbitrer, contrairement à Ultimate Tic-Tac-Toe (rien de
// temporel). L'autorité de manche (alternée, jamais transmise) ne mint la
// graine et n'arbitre JAMAIS avec un avantage de réaction : le rendu et
// l'acceptation des taps sont bloqués derrière le MÊME instant de
// révélation synchronisé des deux côtés, y compris pour elle-même.
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour à côté du state correspondant.
export function useReflexMatchSession({ dataChannel, isInitiator }: UseReflexMatchSessionOptions) {
  const mySide: Side = isInitiator ? "host" : "guest";
  const peerSide: Side = isInitiator ? "guest" : "host";

  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<ReflexPhase>("lobby");
  const [round, setRound] = useState(0);
  const [activeRound, setActiveRound] = useState<ReflexRound | null>(null);
  const [myTapAt, setMyTapAt] = useState<number | null>(null);
  const [lastMiss, setLastMiss] = useState<number | null>(null);
  const [result, setResult] = useState<ReflexRoundResult | null>(null);
  const [scores, setScores] = useState({ host: 0, guest: 0 });
  const [rounds, setRounds] = useState<ReflexRoundResult[]>([]);

  const roundRef = useRef(0);
  const seedRef = useRef(0);
  const advancedToRef = useRef(-1);
  const myTapAtRef = useRef<number | null>(null);
  const peerTapRef = useRef<{ cellIndex: number; tapAt: number } | null>(null);
  const tapSentRef = useRef(false);
  const resultAppliedRef = useRef(false);
  const scoresRef = useRef({ host: 0, guest: 0 });
  const roundsRef = useRef<ReflexRoundResult[]>([]);
  const offsetRef = useRef(0);
  const bestRttRef = useRef(Infinity);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function send(message: ReflexMatchMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  function hostNow(): number {
    return Date.now() + offsetRef.current;
  }

  function resetForRound() {
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
    seedRef.current = 0;
    setActiveRound(null);
    myTapAtRef.current = null;
    setMyTapAt(null);
    setLastMiss(null);
    peerTapRef.current = null;
    tapSentRef.current = false;
    resultAppliedRef.current = false;
    setResult(null);
  }

  // Programme la révélation locale au MÊME instant de référence pour les
  // deux côtés, y compris pour l'autorité qui a miné la graine — jamais de
  // rendu anticipé (voir CLAUDE.md).
  function scheduleReveal(revealAtHost: number) {
    const delay = computeRevealDelay(revealAtHost, offsetRef.current);
    revealTimeoutRef.current = setTimeout(() => {
      setActiveRound(generateRound(seedRef.current));
      setPhase("active");
      roundTimeoutRef.current = setTimeout(() => {
        maybeArbitrate(true);
      }, config.reflexMatch.roundTimeoutMs);
    }, delay);
  }

  function beginRoundAsAuthority(targetRound: number) {
    const seed = Math.floor(Math.random() * 2 ** 31);
    seedRef.current = seed;
    const revealAt = hostNow() + config.reflexMatch.leadMs;
    send({ t: "reflex-round-start", round: targetRound, seed, revealAt });
    scheduleReveal(revealAt);
  }

  // Fait à la fois "lancer la manche 0" et "manche suivante" — gardé par
  // la cible elle-même (comparée à la dernière déjà appliquée), jamais un
  // `id` séparé : les index de manche sont déjà naturellement monotones
  // (même principe que Copy Cat/Duo Quiz), même si la mort subite (voir
  // continueAfterResult) les étend au-delà de config.reflexMatch.rounds.
  function applyAdvance(targetRound: number, matchOver: boolean) {
    if (targetRound <= advancedToRef.current) return;
    advancedToRef.current = targetRound;
    if (matchOver) {
      setPhase("recap");
      return;
    }
    roundRef.current = targetRound;
    setRound(targetRound);
    resetForRound();
    setPhase("pending");
    if (authorityIsInitiatorForRound(targetRound) === isInitiator) {
      beginRoundAsAuthority(targetRound);
    }
  }

  // Autorité de manche uniquement — résout dès que les deux tentatives
  // sont connues, SANS attendre le délai maximal dans ce cas (rien à
  // gagner à attendre plus) ; sinon attend `timedOut` avant de conclure
  // avec ce qui est connu — jamais l'instant où SA PROPRE tentative
  // arrive, ce qui transformerait une latence réseau normale en défaite
  // injustifiée pour l'autre côté (voir CLAUDE.md).
  function maybeArbitrate(timedOut: boolean) {
    if (authorityIsInitiatorForRound(roundRef.current) !== isInitiator) return;
    if (resultAppliedRef.current) return;
    const myTapAtValue = myTapAtRef.current;
    const peerTapAtValue = peerTapRef.current?.tapAt ?? null;
    const bothKnown = myTapAtValue !== null && peerTapAtValue !== null;
    if (!bothKnown && !timedOut) return;

    resultAppliedRef.current = true;
    if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);

    let winner: ReflexWinner;
    if (myTapAtValue !== null && peerTapAtValue !== null) winner = myTapAtValue <= peerTapAtValue ? mySide : peerSide;
    else if (myTapAtValue !== null) winner = mySide;
    else if (peerTapAtValue !== null) winner = peerSide;
    else winner = "draw";

    const hostTapAt = mySide === "host" ? myTapAtValue : peerTapAtValue;
    const guestTapAt = mySide === "guest" ? myTapAtValue : peerTapAtValue;
    const roundResult: ReflexRoundResult = {
      round: roundRef.current,
      winner,
      hostTapAt,
      guestTapAt,
      oddIndex: generateRound(seedRef.current).oddIndex,
    };
    send({ t: "reflex-round-result", ...roundResult });
    applyResult(roundResult);
  }

  function applyResult(roundResult: ReflexRoundResult) {
    setResult(roundResult);
    setPhase("result");
    scoresRef.current = {
      host: scoresRef.current.host + (roundResult.winner === "host" ? 1 : 0),
      guest: scoresRef.current.guest + (roundResult.winner === "guest" ? 1 : 0),
    };
    setScores(scoresRef.current);
    roundsRef.current = [...roundsRef.current, roundResult];
    setRounds(roundsRef.current);
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as ReflexMatchMessage;

      if (message.t === "reflex-ping") {
        // Seul l'hôte répond — il reste la référence d'horloge (offset 0),
        // jamais l'inverse.
        if (isInitiator) send({ t: "reflex-pong", c: message.c, s: Date.now() });
      } else if (message.t === "reflex-pong") {
        const r = Date.now();
        const sample = computeSample(message.c, message.s, r);
        if (sample.rtt < bestRttRef.current) {
          bestRttRef.current = sample.rtt;
          offsetRef.current = sample.offset;
        }
      } else if (message.t === "reflex-round-start") {
        if (message.round !== roundRef.current) return;
        seedRef.current = message.seed;
        scheduleReveal(message.revealAt);
      } else if (message.t === "reflex-tap") {
        if (message.round !== roundRef.current) return;
        if (authorityIsInitiatorForRound(roundRef.current) !== isInitiator) return;
        peerTapRef.current = { cellIndex: message.cellIndex, tapAt: message.tapAt };
        maybeArbitrate(false);
      } else if (message.t === "reflex-round-result") {
        if (message.round !== roundRef.current) return;
        if (resultAppliedRef.current) return;
        resultAppliedRef.current = true;
        if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
        applyResult(message);
      } else if (message.t === "reflex-advance") {
        setHasStarted(true);
        applyAdvance(message.round, message.matchOver);
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  // Mesure de l'offset d'horloge — l'invité·e uniquement, une fois par
  // connexion (l'hôte reste la référence, jamais l'inverse). Nécessaire
  // même si l'autorité de manche alterne : qui a l'autorité convertit
  // toujours SON PROPRE horodatage local vers l'heure de référence (hôte)
  // via son propre offset (0 pour l'hôte, mesuré ici pour l'invité·e).
  useEffect(() => {
    if (!dataChannel || isInitiator) return;
    let sent = 0;
    const interval = setInterval(() => {
      if (sent >= config.clockSync.samples) {
        clearInterval(interval);
        return;
      }
      sent += 1;
      send({ t: "reflex-ping", c: Date.now() });
    }, config.clockSync.intervalMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel, isInitiator]);

  function launch() {
    setHasStarted(true);
    scoresRef.current = { host: 0, guest: 0 };
    setScores(scoresRef.current);
    roundsRef.current = [];
    setRounds([]);
    advancedToRef.current = -1;
    send({ t: "reflex-advance", round: 0, matchOver: false });
    applyAdvance(0, false);
  }

  // Case tapée — jamais soumis à un tour (voir CLAUDE.md), les deux côtés
  // peuvent taper l'instant où la grille se révèle chez eux. Un faux départ
  // est structurellement impossible : les cases ne sont même pas montées
  // dans le DOM avant `phase === "active"`. Une case ratée déclenche juste
  // un retour visuel local (voir `lastMiss`), jamais de message réseau.
  function tap(cellIndex: number) {
    if (phase !== "active" || tapSentRef.current) return;
    if (cellIndex !== activeRound?.oddIndex) {
      setLastMiss(Date.now());
      return;
    }
    tapSentRef.current = true;
    const tapAt = hostNow();
    myTapAtRef.current = tapAt;
    setMyTapAt(tapAt);
    send({ t: "reflex-tap", round: roundRef.current, cellIndex, tapAt });
    if (authorityIsInitiatorForRound(roundRef.current) === isInitiator) maybeArbitrate(false);
  }

  // "Manche suivante" — soit une manche de plus, soit direction récap si
  // le match est décidé. Mort subite : au-delà de config.reflexMatch.rounds,
  // tant que les scores restent à égalité, on rejoue une manche de plus
  // (jamais de manche nulle qui compte comme point, donc une égalité
  // stricte reste possible même après le nombre nominal de manches).
  function continueAfterResult() {
    const played = roundRef.current + 1;
    const matchOver = played >= config.reflexMatch.rounds && scoresRef.current.host !== scoresRef.current.guest;
    send({ t: "reflex-advance", round: played, matchOver });
    applyAdvance(played, matchOver);
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger ni renégocier WebRTC.
  function replay() {
    setHasStarted(false);
    advancedToRef.current = -1;
    roundRef.current = 0;
    setRound(0);
    roundsRef.current = [];
    setRounds([]);
    resetForRound();
    setPhase("lobby");
  }

  // Exposé plutôt que recalculé côté composant (voir
  // ReflexMatchRoundStage.tsx "Manche suivante" vs "Voir le récap") : une
  // seule source de vérité pour "ce clic enverra-t-il vers le récap",
  // jamais deux copies de la même condition qui pourraient diverger.
  const willEndMatchAfterThisRound = round + 1 >= config.reflexMatch.rounds && scores.host !== scores.guest;

  return {
    hasStarted,
    phase,
    round,
    totalRounds: config.reflexMatch.rounds,
    mySide,
    activeRound,
    myTapAt,
    lastMiss,
    result,
    scores,
    rounds,
    willEndMatchAfterThisRound,
    launch,
    tap,
    continueAfterResult,
    replay,
  };
}

export type UseReflexMatchSessionReturn = ReturnType<typeof useReflexMatchSession>;
