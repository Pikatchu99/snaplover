"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { config } from "@/lib/config";
import { findQuestion, pickQuestionIds } from "@/lib/duo-quiz/pick-questions";
import type { DuoQuizMessage } from "@/types/duo-quiz-realtime";
import type { DuoQuizPhase, DuoQuizRoundResult } from "@/types/duo-quiz";
import type { Locale } from "@/i18n/routing";

interface UseDuoQuizSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

// Orchestration d'une partie Duo Quiz : questions de culture générale
// identiques des deux côtés (banque statique bilingue, voir
// lib/duo-quiz/pick-questions.ts), AUCUN tour dans une manche — les deux
// répondent au même instant, sans attendre l'autre (même principe que la
// tentative de mot entier de Word Sonar). Contrairement à Doodle Duel/Word
// Sonar/Edge Letters, l'autorité de manche ne change JAMAIS de main :
// l'hôte reste seul arbitre pour toute la session, parce qu'il n'y a
// structurellement rien à cacher ici — la banque de questions est publique
// et identique des deux côtés avant même le début de la partie (voir
// CLAUDE.md "Duo Quiz").
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour à côté du state correspondant.
export function useDuoQuizSession({ dataChannel, isInitiator }: UseDuoQuizSessionOptions) {
  const locale = useLocale() as Locale;

  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<DuoQuizPhase>("lobby");
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [myAnswerIndex, setMyAnswerIndex] = useState<number | null>(null);
  const [myCorrect, setMyCorrect] = useState<boolean | null>(null);
  const [revealCorrectIndex, setRevealCorrectIndex] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(config.duoQuiz.roundDurationMs);
  const [scores, setScores] = useState({ host: 0, guest: 0 });
  const [rounds, setRounds] = useState<DuoQuizRoundResult[]>([]);

  const pickedIdsRef = useRef<string[]>([]);
  const roundIndexRef = useRef(0);
  const currentQuestionIdRef = useRef<string | null>(null);
  const myAnswerIndexRef = useRef<number | null>(null);
  const myAnswerCorrectRef = useRef<boolean | null>(null);
  const peerAnswerCorrectRef = useRef<boolean | null>(null);
  const roundEndedRef = useRef(false);
  const deadlineRef = useRef(0);
  const scoresRef = useRef({ host: 0, guest: 0 });
  const roundsRef = useRef<DuoQuizRoundResult[]>([]);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function send(message: DuoQuizMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  // Réinitialise l'état d'une manche — utilisé par l'hôte (startRound) ET
  // par l'invité·e (réception de "duoquiz-round-start"), jamais dupliqué.
  function beginRound(index: number, questionId: string) {
    roundIndexRef.current = index;
    setRoundIndex(index);
    currentQuestionIdRef.current = questionId;
    setCurrentQuestionId(questionId);
    myAnswerIndexRef.current = null;
    setMyAnswerIndex(null);
    myAnswerCorrectRef.current = null;
    setMyCorrect(null);
    peerAnswerCorrectRef.current = null;
    roundEndedRef.current = false;
    setRevealCorrectIndex(null);
    deadlineRef.current = Date.now() + config.duoQuiz.roundDurationMs;
    setRemainingMs(config.duoQuiz.roundDurationMs);
    setPhase("round");
    tickTimer();
  }

  // Chrono affiché des DEUX côtés, mais seul l'hôte agit à son expiration
  // (voir CLAUDE.md) — l'invité·e se contente d'afficher un compte à rebours
  // qui s'arrête sans rien déclencher, en attendant "duoquiz-round-end".
  function tickTimer() {
    if (roundEndedRef.current) return;
    const remain = deadlineRef.current - Date.now();
    setRemainingMs(Math.max(0, remain));
    if (remain <= 0) {
      if (isInitiator) hostEndRound();
      return;
    }
    requestAnimationFrame(tickTimer);
  }

  // Verdict + score partagé par les deux côtés : `hostCorrect`/`guestCorrect`
  // se déduisent de "ma propre réponse" et "la réponse reçue de l'autre",
  // remappées selon qui est hôte/invité·e — jamais une distinction séparée à
  // maintenir de chaque côté. Gardée idempotente (roundEndedRef) : appelée
  // par l'hôte directement (hostEndRound) ET par l'invité·e à la réception
  // de "duoquiz-round-end", jamais dupliquée.
  function applyRoundEnd(index: number) {
    if (index !== roundIndexRef.current) return;
    if (roundEndedRef.current) return;
    roundEndedRef.current = true;

    const hostCorrect = isInitiator ? myAnswerCorrectRef.current === true : peerAnswerCorrectRef.current === true;
    const guestCorrect = isInitiator ? peerAnswerCorrectRef.current === true : myAnswerCorrectRef.current === true;
    scoresRef.current = {
      host: scoresRef.current.host + (hostCorrect ? 1 : 0),
      guest: scoresRef.current.guest + (guestCorrect ? 1 : 0),
    };
    setScores(scoresRef.current);

    const result: DuoQuizRoundResult = { roundIndex: index, questionId: currentQuestionIdRef.current!, hostCorrect, guestCorrect };
    roundsRef.current = [...roundsRef.current, result];
    setRounds(roundsRef.current);

    const question = findQuestion(currentQuestionIdRef.current!);
    setRevealCorrectIndex(question?.correctIndex ?? null);
    setPhase("reveal");
  }

  // Hôte uniquement — déclenché soit par "les deux verdicts sont connus"
  // (maybeEndRound), soit par l'expiration de son propre chrono (tickTimer).
  // Ces deux déclencheurs locaux pourraient courir l'un contre l'autre sur
  // le MÊME client : gardé par roundEndedRef (voir applyRoundEnd) pour
  // n'envoyer "duoquiz-round-end" qu'une seule fois, jamais deux manches
  // sautées d'un coup — même classe de bug que les autres jeux du hub,
  // ici deux déclencheurs locaux plutôt que deux humains qui cliquent.
  function hostEndRound() {
    if (roundEndedRef.current) return;
    applyRoundEnd(roundIndexRef.current);
    send({ t: "duoquiz-round-end", roundIndex: roundIndexRef.current });
    scheduleAdvance();
  }

  function maybeEndRound() {
    if (myAnswerCorrectRef.current === null || peerAnswerCorrectRef.current === null) return;
    hostEndRound();
  }

  // Hôte uniquement — après la pause de révélation, enchaîne automatiquement
  // sur la manche suivante (AUCUN clic manuel, contrairement à "Manche
  // suivante" d'Edge Letters/Word Sonar) ou passe au récap après la
  // dernière, avec le score final comme filet de sécurité canonique.
  function scheduleAdvance() {
    advanceTimeoutRef.current = setTimeout(() => {
      const nextIndex = roundIndexRef.current + 1;
      if (nextIndex >= config.duoQuiz.rounds) {
        send({ t: "duoquiz-game-over", hostScore: scoresRef.current.host, guestScore: scoresRef.current.guest });
        setPhase("recap");
      } else {
        startRound(nextIndex);
      }
    }, config.duoQuiz.revealPauseMs);
  }

  function startRound(index: number) {
    const questionId = pickedIdsRef.current[index];
    beginRound(index, questionId);
    send({ t: "duoquiz-round-start", roundIndex: index, questionId });
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as DuoQuizMessage;

      if (message.t === "duoquiz-round-start") {
        setHasStarted(true);
        beginRound(message.roundIndex, message.questionId);
      } else if (message.t === "duoquiz-answer-result") {
        if (message.roundIndex !== roundIndexRef.current) return;
        peerAnswerCorrectRef.current = message.correct;
        if (isInitiator) maybeEndRound();
      } else if (message.t === "duoquiz-round-end") {
        applyRoundEnd(message.roundIndex);
      } else if (message.t === "duoquiz-game-over") {
        scoresRef.current = { host: message.hostScore, guest: message.guestScore };
        setScores(scoresRef.current);
        setPhase("recap");
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  // Lancement (hôte uniquement, voir DuoQuizLobby.tsx) — pioche l'ordre des
  // questions localement (jamais transmis, voir pick-questions.ts) et
  // démarre la manche 0.
  function launch() {
    pickedIdsRef.current = pickQuestionIds(config.duoQuiz.rounds);
    setHasStarted(true);
    scoresRef.current = { host: 0, guest: 0 };
    setScores(scoresRef.current);
    roundsRef.current = [];
    setRounds([]);
    startRound(0);
  }

  // Verrouille ma réponse et calcule mon propre verdict à partir de la
  // banque PUBLIQUE (voir CLAUDE.md) — jamais en attente d'une information
  // du réseau. N'importe quel côté (hôte ou invité·e) peut répondre en
  // premier, aucun tour à respecter.
  function selectAnswer(choiceIndex: number) {
    if (phase !== "round" || myAnswerIndexRef.current !== null || remainingMs <= 0) return;
    const question = findQuestion(currentQuestionIdRef.current!);
    if (!question) return;
    const isCorrect = choiceIndex === question.correctIndex;
    myAnswerIndexRef.current = choiceIndex;
    setMyAnswerIndex(choiceIndex);
    myAnswerCorrectRef.current = isCorrect;
    setMyCorrect(isCorrect);
    send({ t: "duoquiz-answer-result", roundIndex: roundIndexRef.current, correct: isCorrect });
    if (isInitiator) maybeEndRound();
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger ni renégocier WebRTC. Aucun message réseau (même convention
  // que Doodle Duel replay()) : chaque côté revient à sa propre salle
  // d'attente indépendamment, l'hôte doit relancer explicitement.
  function replay() {
    setHasStarted(false);
    pickedIdsRef.current = [];
    roundIndexRef.current = 0;
    setRoundIndex(0);
    currentQuestionIdRef.current = null;
    setCurrentQuestionId(null);
    scoresRef.current = { host: 0, guest: 0 };
    setScores(scoresRef.current);
    roundsRef.current = [];
    setRounds([]);
    setPhase("lobby");
  }

  const question = currentQuestionId ? findQuestion(currentQuestionId) : undefined;
  const awaitingPartner = phase === "round" && myAnswerIndex !== null;

  return {
    hasStarted,
    phase,
    roundIndex,
    totalRounds: config.duoQuiz.rounds,
    prompt: question?.prompt[locale] ?? "",
    choices: question?.choices[locale] ?? [],
    myAnswerIndex,
    myCorrect,
    revealCorrectIndex,
    awaitingPartner,
    remainingMs,
    scores,
    rounds,
    launch,
    selectAnswer,
    replay,
  };
}

export type UseDuoQuizSessionReturn = ReturnType<typeof useDuoQuizSession>;
