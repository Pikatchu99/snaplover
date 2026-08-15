"use client";

import { useEffect, useRef, useState } from "react";
import { isSameWord, letterPositions } from "@/lib/text/normalize-word";
import { config } from "@/lib/config";
import type { WordSonarMessage } from "@/types/word-sonar-realtime";
import type { WordSonarEvent, WordSonarPhase, WordSonarRoundResult } from "@/types/word-sonar";

interface UseWordSonarSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

// Orchestration d'une partie Word Sonar : `config.wordSonar.rounds` manches,
// chacune consistant à deviner le mot secret de l'autre en alternant
// question ("as-tu telle lettre ?", position(s) révélée(s) si oui) ou
// tentative du mot entier. Le mot secret de chacun·e ne quitte JAMAIS son
// appareil : la réponse à une question est calculée localement par qui
// répond, à partir de SON PROPRE mot (jamais transmis en clair) — même
// principe d'autorité unique que Doodle Duel (qui dessine juge les essais),
// sauf qu'ici l'autorité change de main à CHAQUE question/tentative, pas
// seulement à chaque manche.
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour par un effet dédié (ou directement mutée pour les refs
// sensibles au timing, comme `roundStartAtRef`/`roundEndedRef` dans
// use-duel-session.ts).
export function useWordSonarSession({ dataChannel, isInitiator }: UseWordSonarSessionOptions) {
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<WordSonarPhase>("lobby");
  const [roundIndex, setRoundIndex] = useState(0);
  const [length, setLength] = useState<number>(config.wordSonar.defaultLength);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [myWordReady, setMyWordReady] = useState(false);
  const [peerWordReady, setPeerWordReady] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [awaitingResult, setAwaitingResult] = useState(false);
  const [turnRemainingMs, setTurnRemainingMs] = useState<number>(config.wordSonar.turnDurationMs);
  const [events, setEvents] = useState<WordSonarEvent[]>([]);
  const [rounds, setRounds] = useState<WordSonarRoundResult[]>([]);
  const [lastResult, setLastResult] = useState<WordSonarRoundResult | null>(null);

  const roundIndexRef = useRef(0);
  const lengthRef = useRef<number>(config.wordSonar.defaultLength);
  const myWordRef = useRef<string | null>(null);
  const myWordReadyRef = useRef(false);
  const peerWordReadyRef = useRef(false);
  const isMyTurnRef = useRef(false);
  const awaitingResultRef = useRef(false);
  const turnsRef = useRef(0);
  const turnDeadlineRef = useRef(0);
  const turnEndedRef = useRef(true);
  // Garde contre le double-avancement après une révélation — même bug de
  // classe déjà rencontré et corrigé côté Doodle Duel/Mind Match (voir
  // types/word-sonar-realtime.ts "wordsonar-advance").
  const advancedRef = useRef(false);

  useEffect(() => {
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);
  useEffect(() => {
    lengthRef.current = length;
  }, [length]);

  const totalRounds = config.wordSonar.rounds;
  const isLastRound = roundIndex >= totalRounds - 1;

  function send(message: WordSonarMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  function pushEvent(event: WordSonarEvent) {
    turnsRef.current += 1;
    setEvents((prev) => [...prev, event]);
  }

  // Qui pose la première question de chaque manche — pure fonction de
  // l'index, jamais transmise : les deux côtés la déduisent identiquement
  // (même principe que `drawerIsInitiatorForRound` côté Doodle Duel).
  const askerIsInitiatorForRound = (index: number) => index % 2 === 0;

  function tickTurnTimer() {
    const remain = turnDeadlineRef.current - Date.now();
    setTurnRemainingMs(Math.max(0, remain));
    if (remain <= 0) {
      if (isMyTurnRef.current && !turnEndedRef.current) {
        turnEndedRef.current = true;
        handleMyTurnTimeout();
      }
      return;
    }
    requestAnimationFrame(tickTurnTimer);
  }

  function startTurnTimer() {
    turnEndedRef.current = false;
    turnDeadlineRef.current = Date.now() + config.wordSonar.turnDurationMs;
    setTurnRemainingMs(config.wordSonar.turnDurationMs);
    tickTurnTimer();
  }

  function flipTurnToMe() {
    isMyTurnRef.current = true;
    setIsMyTurn(true);
    startTurnTimer();
  }

  function flipTurnToPeer() {
    isMyTurnRef.current = false;
    setIsMyTurn(false);
    startTurnTimer();
  }

  function maybeStartPlaying() {
    if (!myWordReadyRef.current || !peerWordReadyRef.current) return;
    const iAskFirst = askerIsInitiatorForRound(roundIndexRef.current) === isInitiator;
    isMyTurnRef.current = iAskFirst;
    setIsMyTurn(iAskFirst);
    startTurnTimer();
    setPhase("playing");
  }

  function finalizeRound(iWon: boolean, word: string) {
    turnEndedRef.current = true;
    advancedRef.current = false;
    const result: WordSonarRoundResult = { round: roundIndexRef.current, iWon, word, turns: turnsRef.current };
    setLastResult(result);
    setRounds((prev) => [...prev, result]);
    setPhase("reveal");
  }

  function handleMyTurnTimeout() {
    pushEvent({ askerIsMe: true, kind: "skip" });
    send({ t: "wordsonar-turn-timeout" });
    flipTurnToPeer();
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as WordSonarMessage;
      setHasStarted(true);

      if (message.t === "wordsonar-start") {
        lengthRef.current = message.length;
        setLength(message.length);
        roundIndexRef.current = 0;
        setRoundIndex(0);
        resetForNewRound();
        setPhase("picking");
      } else if (message.t === "wordsonar-word-ready") {
        peerWordReadyRef.current = true;
        setPeerWordReady(true);
        maybeStartPlaying();
      } else if (message.t === "wordsonar-ask-letter") {
        // Je réponds : calculé à partir de MON mot, jamais transmis en clair.
        const positions = letterPositions(myWordRef.current ?? "", message.letter);
        pushEvent({ askerIsMe: false, kind: "letter", letter: message.letter, positions });
        send({ t: "wordsonar-letter-result", letter: message.letter, positions });
        flipTurnToMe();
      } else if (message.t === "wordsonar-letter-result") {
        pushEvent({ askerIsMe: true, kind: "letter", letter: message.letter, positions: message.positions });
        awaitingResultRef.current = false;
        setAwaitingResult(false);
        flipTurnToPeer();
      } else if (message.t === "wordsonar-guess-word") {
        const correct = isSameWord(message.word, myWordRef.current ?? "");
        pushEvent({ askerIsMe: false, kind: "guess", word: message.word, correct });
        send({ t: "wordsonar-guess-result", word: message.word, correct });
        if (correct) finalizeRound(false, myWordRef.current ?? "");
        else flipTurnToMe();
      } else if (message.t === "wordsonar-guess-result") {
        pushEvent({ askerIsMe: true, kind: "guess", word: message.word, correct: message.correct });
        awaitingResultRef.current = false;
        setAwaitingResult(false);
        if (message.correct) finalizeRound(true, message.word);
        else flipTurnToPeer();
      } else if (message.t === "wordsonar-turn-timeout") {
        pushEvent({ askerIsMe: false, kind: "skip" });
        flipTurnToMe();
      } else if (message.t === "wordsonar-advance") {
        if (message.round === roundIndexRef.current) applyAdvance();
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  function resetForNewRound() {
    myWordRef.current = null;
    setMyWord(null);
    myWordReadyRef.current = false;
    setMyWordReady(false);
    peerWordReadyRef.current = false;
    setPeerWordReady(false);
    setEvents([]);
    turnsRef.current = 0;
    turnEndedRef.current = true;
  }

  function applyAdvance() {
    if (advancedRef.current) return;
    advancedRef.current = true;

    if (roundIndexRef.current >= totalRounds - 1) {
      setPhase("recap");
      return;
    }
    roundIndexRef.current += 1;
    setRoundIndex(roundIndexRef.current);
    resetForNewRound();
    setPhase("picking");
  }

  // Lancement (hôte uniquement, voir WordSonarLobby.tsx) — communique la
  // longueur de mot choisie, jamais rechangée en cours de partie.
  function launch(chosenLength: number) {
    setHasStarted(true);
    lengthRef.current = chosenLength;
    setLength(chosenLength);
    roundIndexRef.current = 0;
    setRoundIndex(0);
    resetForNewRound();
    send({ t: "wordsonar-start", length: chosenLength });
    setPhase("picking");
  }

  function submitWord(word: string) {
    const trimmed = word.trim();
    if (trimmed.length !== lengthRef.current) return;
    myWordRef.current = trimmed;
    setMyWord(trimmed);
    myWordReadyRef.current = true;
    setMyWordReady(true);
    send({ t: "wordsonar-word-ready" });
    maybeStartPlaying();
  }

  function askLetter(letter: string) {
    if (!isMyTurnRef.current || awaitingResultRef.current) return;
    const normalized = letter.trim().toUpperCase();
    if (!normalized) return;
    awaitingResultRef.current = true;
    setAwaitingResult(true);
    send({ t: "wordsonar-ask-letter", letter: normalized });
  }

  function guessWord(word: string) {
    if (!isMyTurnRef.current || awaitingResultRef.current) return;
    const trimmed = word.trim();
    if (trimmed.length !== lengthRef.current) return;
    awaitingResultRef.current = true;
    setAwaitingResult(true);
    send({ t: "wordsonar-guess-word", word: trimmed });
  }

  function continueAfterReveal() {
    send({ t: "wordsonar-advance", round: roundIndexRef.current });
    applyAdvance();
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger la page ni renégocier WebRTC (même convention que les autres
  // jeux). Repasse par "lobby" (pas directement "picking") : la longueur du
  // mot redevient un choix de l'hôte, comme au tout premier lancement.
  function replay() {
    roundIndexRef.current = 0;
    setRoundIndex(0);
    resetForNewRound();
    setRounds([]);
    setLastResult(null);
    setPhase("lobby");
  }

  return {
    hasStarted,
    phase,
    round: roundIndex,
    totalRounds,
    isLastRound,
    length,
    myWord,
    myWordReady,
    peerWordReady,
    isMyTurn,
    awaitingResult,
    turnRemainingMs,
    events,
    rounds,
    lastResult,
    launch,
    submitWord,
    askLetter,
    guessWord,
    continueAfterReveal,
    replay,
  };
}

export type UseWordSonarSessionReturn = ReturnType<typeof useWordSonarSession>;
