"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { loadFrenchWordSet } from "@/lib/text/word-list";
import { isValidEdgeLettersWord } from "@/lib/edge-letters/validate";
import type { EdgeLettersMessage } from "@/types/edge-letters-realtime";
import type { EdgeLettersPhase, EdgeLettersRole, EdgeLettersRoundResult } from "@/types/edge-letters";

interface UseEdgeLettersSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Qui a la main pour le rôle "lettre de DÉBUT" ET pour l'arbitrage cette
// manche — délibérément la MÊME parité pour les deux (voir CLAUDE.md "Edge
// Letters") : une seule fonction, une seule source de vérité, jamais deux
// parités indépendantes qui pourraient dériver l'une de l'autre.
function roundAuthorityIsInitiator(round: number): boolean {
  return round % 2 === 0;
}

// Orchestration d'une partie Edge Letters : `config.edgeLetters.rounds`
// manches, chacune consistant à choisir une lettre de début/fin (une
// chacun·e) puis à courir pour taper un vrai mot français qui les respecte.
// AUCUN tour pendant la course — c'est le point central du jeu (voir
// CLAUDE.md), la seule chose "de tour" est le RÔLE (qui choisit quelle
// lettre), jamais une action gatée. Un·e seul·e arbitre par manche (même
// parité que le rôle) tranche qui a tenté en premier et revalide
// indépendamment le mot avant de créditer quoi que ce soit — jamais de
// confiance aveugle en un client modifié.
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour par un effet dédié.
export function useEdgeLettersSession({ dataChannel, isInitiator }: UseEdgeLettersSessionOptions) {
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<EdgeLettersPhase>("lobby");
  const [round, setRound] = useState(0);
  const [startLetter, setStartLetter] = useState<string | null>(null);
  const [endLetter, setEndLetter] = useState<string | null>(null);
  const [myLetterPicked, setMyLetterPicked] = useState(false);
  const [myClaimSubmitted, setMyClaimSubmitted] = useState(false);
  const [raceRemainingMs, setRaceRemainingMs] = useState<number>(config.edgeLetters.raceDurationMs);
  const [rounds, setRounds] = useState<EdgeLettersRoundResult[]>([]);
  const [lastResult, setLastResult] = useState<EdgeLettersRoundResult | null>(null);
  const [wordSetReady, setWordSetReady] = useState(false);

  const roundRef = useRef(0);
  const startLetterRef = useRef<string | null>(null);
  const endLetterRef = useRef<string | null>(null);
  const wordSetRef = useRef<Set<string> | null>(null);
  const pickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raceDeadlineRef = useRef(0);
  const raceEndedRef = useRef(true);
  const roundResolvedRef = useRef(false);
  // Garde contre le double-avancement — même bug de classe déjà rencontré et
  // corrigé sur Doodle Duel/Mind Match/Word Sonar/Connect Duo (voir
  // "edgeletters-advance").
  const advancedRef = useRef(false);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  useEffect(() => {
    startLetterRef.current = startLetter;
  }, [startLetter]);
  useEffect(() => {
    endLetterRef.current = endLetter;
  }, [endLetter]);

  // Chargée au montage (pas seulement à l'entrée en "racing" comme le
  // suggérait la spec) : le code-splitting de l'import() dynamique suffit
  // déjà à ne jamais alourdir les autres pages, cette room-ci n'existe que
  // pour ce jeu de toute façon.
  useEffect(() => {
    let cancelled = false;
    loadFrenchWordSet().then((set) => {
      if (cancelled) return;
      wordSetRef.current = set;
      setWordSetReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const myRole: EdgeLettersRole = roundAuthorityIsInitiator(round) === isInitiator ? "start" : "end";
  const isLastRound = round >= config.edgeLetters.rounds - 1;

  function send(message: EdgeLettersMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  function maybeStartRacing() {
    if (!startLetterRef.current || !endLetterRef.current) return;
    setPhase("racing");
    raceEndedRef.current = false;
    raceDeadlineRef.current = Date.now() + config.edgeLetters.raceDurationMs;
    setRaceRemainingMs(config.edgeLetters.raceDurationMs);
    tickRaceTimer();
  }

  // Chrono de course — tick localement des DEUX côtés à partir du même
  // instant logique (l'entrée en "racing", quasi simultanée), mais seul
  // l'arbitre de la manche déclenche le verdict de match nul à
  // l'expiration ; l'autre côté ne fait qu'afficher le compte à rebours et
  // s'arrête sans rien déclencher.
  function tickRaceTimer() {
    if (raceEndedRef.current) return;
    const remain = raceDeadlineRef.current - Date.now();
    setRaceRemainingMs(Math.max(0, remain));
    if (remain <= 0) {
      raceEndedRef.current = true;
      if (roundAuthorityIsInitiator(roundRef.current) === isInitiator) declareDraw();
      return;
    }
    requestAnimationFrame(tickRaceTimer);
  }

  function applyRoundResult(result: EdgeLettersRoundResult) {
    raceEndedRef.current = true;
    setLastResult(result);
    setRounds((prev) => [...prev, result]);
    setPhase("reveal");
  }

  // Arbitre uniquement — revalide indépendamment avant de créditer quoi que
  // ce soit (une tentative reçue pourrait venir d'un client modifié/buggé).
  function resolveClaim(word: string, claimant: "host" | "guest") {
    if (roundResolvedRef.current) return;
    if (!wordSetRef.current || !startLetterRef.current || !endLetterRef.current) return;
    if (!isValidEdgeLettersWord(word, startLetterRef.current, endLetterRef.current, wordSetRef.current)) return;
    roundResolvedRef.current = true;
    const result: EdgeLettersRoundResult = {
      round: roundRef.current,
      startLetter: startLetterRef.current,
      endLetter: endLetterRef.current,
      winner: claimant,
      word,
    };
    send({ t: "edgeletters-round-result", round: roundRef.current, winner: claimant, word });
    applyRoundResult(result);
  }

  // Arbitre uniquement — déclenché par son propre chrono de course expiré
  // sans tentative valide reçue.
  function declareDraw() {
    if (roundResolvedRef.current) return;
    roundResolvedRef.current = true;
    const result: EdgeLettersRoundResult = {
      round: roundRef.current,
      startLetter: startLetterRef.current ?? "",
      endLetter: endLetterRef.current ?? "",
      winner: null,
      word: null,
    };
    send({ t: "edgeletters-round-result", round: roundRef.current, winner: null, word: null });
    applyRoundResult(result);
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as EdgeLettersMessage;

      if (message.t === "edgeletters-start") {
        setHasStarted(true);
        resetForNewMatch();
        setPhase("picking");
      } else if (message.t === "edgeletters-letter-pick") {
        if (message.round !== roundRef.current) return;
        if (message.role === "start") {
          startLetterRef.current = message.letter;
          setStartLetter(message.letter);
        } else {
          endLetterRef.current = message.letter;
          setEndLetter(message.letter);
        }
        maybeStartRacing();
      } else if (message.t === "edgeletters-claim") {
        if (message.round !== roundRef.current) return;
        // Seul·e l'arbitre de cette manche agit sur une tentative reçue —
        // l'autre côté attend toujours "edgeletters-round-result".
        if (roundAuthorityIsInitiator(roundRef.current) !== isInitiator) return;
        resolveClaim(message.word, isInitiator ? "guest" : "host");
      } else if (message.t === "edgeletters-round-result") {
        if (message.round !== roundRef.current) return;
        applyRoundResult({
          round: message.round,
          startLetter: startLetterRef.current ?? "",
          endLetter: endLetterRef.current ?? "",
          winner: message.winner,
          word: message.word,
        });
      } else if (message.t === "edgeletters-advance") {
        if (message.round === roundRef.current) applyAdvance();
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  function resetForNewRound() {
    startLetterRef.current = null;
    setStartLetter(null);
    endLetterRef.current = null;
    setEndLetter(null);
    setMyLetterPicked(false);
    setMyClaimSubmitted(false);
    roundResolvedRef.current = false;
    advancedRef.current = false;
    raceEndedRef.current = true;
    setRaceRemainingMs(config.edgeLetters.raceDurationMs);
    if (pickTimeoutRef.current) clearTimeout(pickTimeoutRef.current);
  }

  function resetForNewMatch() {
    roundRef.current = 0;
    setRound(0);
    setRounds([]);
    setLastResult(null);
    resetForNewRound();
  }

  // Lancement (hôte uniquement, voir EdgeLettersLobby.tsx) — aucune config à
  // communiquer, contrairement à la longueur de mot de Word Sonar.
  function launch() {
    setHasStarted(true);
    resetForNewMatch();
    send({ t: "edgeletters-start" });
    setPhase("picking");
  }

  function pickLetter(letter: string) {
    if (myLetterPicked) return;
    setMyLetterPicked(true);
    if (pickTimeoutRef.current) {
      clearTimeout(pickTimeoutRef.current);
      pickTimeoutRef.current = null;
    }
    if (myRole === "start") {
      startLetterRef.current = letter;
      setStartLetter(letter);
    } else {
      endLetterRef.current = letter;
      setEndLetter(letter);
    }
    send({ t: "edgeletters-letter-pick", round: roundRef.current, role: myRole, letter });
    maybeStartRacing();
  }

  // Chrono de choix de lettre — purement LOCAL (voir CLAUDE.md), aucune
  // coordination réseau : si je n'ai pas choisi à temps, mon propre client
  // tire une lettre au hasard pour moi et l'envoie normalement.
  useEffect(() => {
    if (phase !== "picking" || myLetterPicked) return;
    pickTimeoutRef.current = setTimeout(() => {
      const random = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      pickLetter(random);
    }, config.edgeLetters.pickDurationMs);
    return () => {
      if (pickTimeoutRef.current) clearTimeout(pickTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, myLetterPicked]);

  // Validation locale AVANT tout envoi — une tentative invalide ne touche
  // jamais le réseau (voir lib/edge-letters/validate.ts). Retourne false
  // pour que l'UI affiche un retour immédiat, sans bloquer/alerter.
  function submitClaim(word: string): boolean {
    if (myClaimSubmitted || !wordSetRef.current || !startLetterRef.current || !endLetterRef.current) return false;
    if (!isValidEdgeLettersWord(word, startLetterRef.current, endLetterRef.current, wordSetRef.current)) return false;
    setMyClaimSubmitted(true);
    const trimmed = word.trim();
    send({ t: "edgeletters-claim", round: roundRef.current, word: trimmed });
    if (roundAuthorityIsInitiator(roundRef.current) === isInitiator) {
      resolveClaim(trimmed, isInitiator ? "host" : "guest");
    }
    return true;
  }

  function applyAdvance() {
    if (advancedRef.current) return;
    advancedRef.current = true;
    if (roundRef.current >= config.edgeLetters.rounds - 1) {
      setPhase("recap");
      return;
    }
    roundRef.current += 1;
    setRound(roundRef.current);
    resetForNewRound();
    setPhase("picking");
  }

  function continueAfterReveal() {
    send({ t: "edgeletters-advance", round: roundRef.current });
    applyAdvance();
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger la page ni renégocier WebRTC (même convention que les autres
  // jeux).
  function replay() {
    resetForNewMatch();
    setPhase("lobby");
  }

  return {
    hasStarted,
    phase,
    round,
    totalRounds: config.edgeLetters.rounds,
    isLastRound,
    myRole,
    startLetter,
    endLetter,
    myLetterPicked,
    myClaimSubmitted,
    raceRemainingMs,
    wordSetReady,
    rounds,
    lastResult,
    launch,
    pickLetter,
    submitClaim,
    continueAfterReveal,
    replay,
  };
}

export type UseEdgeLettersSessionReturn = ReturnType<typeof useEdgeLettersSession>;
