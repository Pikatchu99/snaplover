"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { pointFromPointerEvent } from "@/lib/capture/doodle";
import { pickWord, isCorrectGuess } from "@/lib/doodle-duel/pick-word";
import { config } from "@/lib/config";
import type { DoodlePoint, DoodleStroke } from "@/types/doodle";
import type { DuelMessage } from "@/types/duel-realtime";
import type { DuelPhase, DuelRoundResult } from "@/types/duel";

// Couleur d'encre fixe (pas de palette) — Doodle Duel est un jeu, pas un
// outil de dessin : on garde l'attention sur deviner/dessiner vite, pas sur
// choisir une couleur.
const INK_COLOR = "#1c1712";

interface UseDuelSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
  locale: string;
}

export interface DuelGuess {
  text: string;
  /** null tant que la réponse n'est pas encore arrivée (voir soumission côté deveneur·euse). */
  correct: boolean | null;
}

// Orchestration d'une partie Doodle Duel : `config.duel.rounds` manches,
// dessinateur·rice alterné·e (manches paires = hôte, impaires = invité·e —
// aucun message réseau nécessaire, les deux côtés déduisent ce rôle de la
// même parité). Chaque manche n'a qu'UNE seule autorité : qui dessine décide
// du mot, évalue les essais, et déclenche la fin de manche (bonne réponse ou
// chrono écoulé) — jamais les deux côtés à la fois, pour éviter toute course.
//
// Le listener réseau est monté une seule fois (effet à deps [dataChannel,
// isInitiator], même précaution que use-capture-session.ts) : il ne doit
// jamais lire une variable de state fermée par sa closure au montage, sous
// peine de rester bloqué sur sa valeur initiale (mot, manche courante...) —
// tout ce qu'il lit passe par une ref tenue à jour par un effet dédié.
export function useDuelSession({ dataChannel, isInitiator, locale }: UseDuelSessionOptions) {
  // true dès que la partie a démarré — soit localement (je suis l'hôte et
  // j'ai lancé la manche 0 via startDrawerPrep), soit à la réception de
  // n'importe quel message duel (l'invité·e n'envoie jamais rien avant que
  // l'hôte ait lancé la manche 0, donc recevoir quoi que ce soit le prouve).
  // Fait basculer DuelClient.tsx de la salle d'attente connexion vers l'écran
  // de partie, comme hasStarted dans use-capture-session.ts.
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<DuelPhase>("lobby");
  const [roundIndex, setRoundIndex] = useState(0);
  const [word, setWord] = useState<string | null>(null);
  const [myStrokes, setMyStrokes] = useState<DoodleStroke[]>([]);
  const [peerStrokes, setPeerStrokes] = useState<DoodleStroke[]>([]);
  const [guesses, setGuesses] = useState<DuelGuess[]>([]);
  const [remainingMs, setRemainingMs] = useState<number>(config.duel.roundDurationMs);
  const [rounds, setRounds] = useState<DuelRoundResult[]>([]);
  const [lastRound, setLastRound] = useState<DuelRoundResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeIdRef = useRef<string | null>(null);
  const pendingPointsRef = useRef<DoodlePoint[]>([]);
  const rafRef = useRef<number | null>(null);
  const roundEndedRef = useRef(false);
  // Garde contre le double-avancement : sans elle, un clic en double sur
  // "Manche suivante" (ou les deux pairs qui cliquent chacun sur leur écran
  // à quelques centaines de ms d'écart) désynchronisait complètement les
  // deux côtés — l'un avançait de deux manches, l'autre d'une seule (bug réel
  // observé en testant : "manche 2/3" d'un côté, "3/3" de l'autre). Remise à
  // false à chaque nouvelle manche qui se termine (voir finalizeRound).
  const roundAdvancedRef = useRef(false);
  const roundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundStartAtRef = useRef(0);
  const roundDurationRef = useRef<number>(config.duel.roundDurationMs);
  const usedWordsRef = useRef<string[]>([]);

  // Refs "dernière valeur connue", tenues à jour ci-dessous — tout ce que le
  // listener réseau (effet stable) doit lire passe par elles, jamais par le
  // state directement.
  const roundIndexRef = useRef(0);
  const wordRef = useRef<string | null>(null);
  const myStrokesRef = useRef<DoodleStroke[]>([]);
  const peerStrokesRef = useRef<DoodleStroke[]>([]);
  useEffect(() => {
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);
  useEffect(() => {
    wordRef.current = word;
  }, [word]);
  useEffect(() => {
    myStrokesRef.current = myStrokes;
  }, [myStrokes]);
  useEffect(() => {
    peerStrokesRef.current = peerStrokes;
  }, [peerStrokes]);

  const totalRounds = config.duel.rounds;
  // Manches paires (0, 2, …) dessinées par l'hôte — pure fonction de
  // l'index, jamais transmise : les deux côtés la déduisent identiquement.
  const drawerIsInitiatorForRound = (index: number) => index % 2 === 0;
  const isMyTurnToDraw = drawerIsInitiatorForRound(roundIndex) === isInitiator;
  const isLastRound = roundIndex >= totalRounds - 1;

  function send(message: DuelMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  // Fin de manche : construit le résultat à partir de refs (jamais de state
  // fermé par une closure figée), pousse au récap, avance la phase.
  function finalizeRound(finalWord: string, guessed: boolean, timeMs: number, strokes: DoodleStroke[]) {
    if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
    roundEndedRef.current = true;
    roundAdvancedRef.current = false;
    const result: DuelRoundResult = {
      round: roundIndexRef.current,
      word: finalWord,
      drawerIsInitiator: drawerIsInitiatorForRound(roundIndexRef.current),
      guessed,
      timeMs,
      strokes,
    };
    setLastRound(result);
    setRounds((prev) => [...prev, result]);
    setPhase("reveal");
  }

  function tickCountdown() {
    const remain = roundDurationRef.current - (Date.now() - roundStartAtRef.current);
    setRemainingMs(Math.max(0, remain));
    if (remain > 0 && !roundEndedRef.current) requestAnimationFrame(tickCountdown);
  }

  // Applique le passage à la manche suivante (ou au récap) — appelé soit
  // directement par un clic local (goToNextRound), soit à la réception du
  // message réseau envoyé par l'AUTRE pair : quel que soit le déclencheur,
  // les deux côtés doivent obtenir exactement le même résultat. Lit
  // roundIndexRef (jamais `isLastRound`/`roundIndex` fermés par une closure
  // potentiellement obsolète côté listener réseau — même précaution que le
  // reste de ce fichier).
  function applyNextRound() {
    if (roundAdvancedRef.current) return;
    roundAdvancedRef.current = true;
    const isLast = roundIndexRef.current >= totalRounds - 1;
    if (isLast) {
      setPhase("recap");
      return;
    }
    // Repart d'un état vierge des DEUX côtés (dessinateur·rice ET
    // deveneur·euse à venir) — sinon la personne qui redevient
    // dessinateur·rice plus tard dans la partie retrouvait son propre trait
    // de la manche où elle avait dessiné pour la dernière fois (bug réel
    // trouvé en testant : resetRoundState n'était appelé que par
    // startDrawerPrep, jamais côté deveneur·euse à ce point de transition).
    resetRoundState();
    setRoundIndex((prev) => prev + 1);
    setWord(null);
    setPhase("lobby");
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as DuelMessage;
      setHasStarted(true);

      if (message.t === "duel-round-start") {
        // Chrono local côté deveneur·euse : le·la dessinateur·rice a le
        // sien (démarré dans confirmStartDrawing), mais sans ce tick ici, le
        // compte à rebours affiché de mon côté resterait figé à la valeur de
        // départ pendant toute la manche.
        setPhase("drawing");
        roundEndedRef.current = false;
        roundStartAtRef.current = Date.now();
        roundDurationRef.current = message.durationMs;
        setRemainingMs(message.durationMs);
        tickCountdown();
      } else if (message.t === "duel-points") {
        setPeerStrokes((prev) => {
          const existing = prev.find((stroke) => stroke.id === message.strokeId);
          if (existing) {
            return prev.map((stroke) =>
              stroke.id === message.strokeId ? { ...stroke, points: [...stroke.points, ...message.points] } : stroke,
            );
          }
          return [...prev, { id: message.strokeId, color: INK_COLOR, points: [...message.points] }];
        });
      } else if (message.t === "duel-clear") {
        setPeerStrokes([]);
      } else if (message.t === "duel-guess") {
        // Je suis le·la dessinateur·rice cette manche : seul·e à connaître
        // le mot (wordRef, jamais `word` directement — voir note en tête de
        // fichier), donc seul·e à pouvoir juger l'essai.
        const currentWord = wordRef.current;
        const correct = currentWord != null && isCorrectGuess(message.text, currentWord);
        setGuesses((prev) => [...prev, { text: message.text, correct }]);
        send({ t: "duel-guess-result", correct });
        if (correct && !roundEndedRef.current) {
          roundEndedRef.current = true;
          const timeMs = Date.now() - roundStartAtRef.current;
          send({ t: "duel-round-end", word: currentWord, guessed: true, timeMs });
          finalizeRound(currentWord, true, timeMs, myStrokesRef.current);
        }
      } else if (message.t === "duel-guess-result") {
        setGuesses((prev) => {
          const index = prev.findIndex((guess) => guess.correct === null);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = { ...next[index], correct: message.correct };
          return next;
        });
      } else if (message.t === "duel-round-end") {
        // Je suis le·la deveneur·euse cette manche : le dessin final à
        // conserver pour le récap est celui reçu du·de la dessinateur·rice
        // (peerStrokesRef), jamais le mien (vide, je n'ai pas dessiné).
        finalizeRound(message.word, message.guessed, message.timeMs, peerStrokesRef.current);
      } else if (message.t === "duel-next-round") {
        // Ignore un message pour une manche déjà quittée (l'autre pair a
        // cliqué "Manche suivante" à peu près au même moment que moi) —
        // roundAdvancedRef protège aussi contre ça, mais vérifier le numéro
        // de manche rend l'intention explicite plutôt que de compter
        // uniquement sur l'effet de bord du guard.
        if (message.round === roundIndexRef.current) applyNextRound();
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  function resetRoundState() {
    activeStrokeIdRef.current = null;
    pendingPointsRef.current = [];
    setMyStrokes([]);
    setPeerStrokes([]);
    setGuesses([]);
    if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
    roundTimeoutRef.current = null;
  }

  // Étape 1 (dessinateur·rice uniquement) : tire un mot et l'affiche — pas
  // encore de chrono, pas encore de message réseau. Le partenaire ne sait
  // même pas encore qu'une manche se prépare.
  function startDrawerPrep() {
    setHasStarted(true);
    resetRoundState();
    const nextWord = pickWord(locale, usedWordsRef.current);
    usedWordsRef.current = [...usedWordsRef.current, nextWord];
    setWord(nextWord);
    setPhase("drawer-prep");
  }

  // Étape 2 (dessinateur·rice) : "Dessiner !" — c'est CE clic qui démarre
  // vraiment le chrono des deux côtés, jamais une surprise (voir
  // types/duel.ts sur "drawer-prep").
  function confirmStartDrawing() {
    roundEndedRef.current = false;
    roundStartAtRef.current = Date.now();
    roundDurationRef.current = config.duel.roundDurationMs;
    setRemainingMs(config.duel.roundDurationMs);
    send({
      t: "duel-round-start",
      round: roundIndex,
      drawerIsInitiator: isInitiator,
      durationMs: config.duel.roundDurationMs,
    });
    setPhase("drawing");
    tickCountdown();
    roundTimeoutRef.current = setTimeout(() => endRound(false), config.duel.roundDurationMs);
  }

  // Fin de manche déclenchée par le·la dessinateur·rice lui-même·elle-même
  // (chrono écoulé, via le setTimeout ci-dessus) — la version déclenchée par
  // une bonne réponse est gérée directement dans handleMessage ("duel-guess"),
  // pas ici, puisque c'est un message reçu qui la déclenche.
  function endRound(guessed: boolean) {
    if (roundEndedRef.current || !wordRef.current) return;
    roundEndedRef.current = true;
    if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
    const currentWord = wordRef.current;
    const timeMs = guessed ? Date.now() - roundStartAtRef.current : roundDurationRef.current;
    send({ t: "duel-round-end", word: currentWord, guessed, timeMs });
    finalizeRound(currentWord, guessed, timeMs, myStrokesRef.current);
  }

  // Passe à la manche suivante (ou au récap si c'était la dernière) — appelé
  // après la révélation, indépendamment par chaque côté (pas de message
  // réseau : round+1 et son dessinateur·rice sont déductibles identiquement
  // des deux côtés).
  // Appelé par un clic sur "Manche suivante"/"Voir le récap" — la première
  // personne qui clique fait avancer les DEUX écrans (message réseau), au
  // lieu de laisser chaque côté avancer isolément de son côté. Avant ce
  // message, cliquer deux fois par erreur sur un seul écran (ou les deux
  // pairs qui cliquent chacun sur le leur, sans se synchroniser) désynchro-
  // nisait complètement la partie — vu en conditions réelles ("manche 2/3"
  // d'un côté, "3/3" de l'autre pour la même partie).
  function goToNextRound() {
    send({ t: "duel-next-round", round: roundIndexRef.current });
    applyNextRound();
  }

  // "Rejouer" (voir DuelRecap.tsx) — repart pour une partie fraîche sur la
  // MÊME connexion, sans recharger la page ni re-négocier WebRTC. Chaque
  // côté l'appelle indépendamment (pas de message réseau) : round 0 = hôte
  // dessine à nouveau, exactement comme au tout premier lancement.
  function replay() {
    resetRoundState();
    setRoundIndex(0);
    setWord(null);
    setRounds([]);
    setLastRound(null);
    setPhase("lobby");
  }

  function submitGuess(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGuesses((prev) => [...prev, { text: trimmed, correct: null }]);
    send({ t: "duel-guess", text: trimmed });
  }

  function flush(strokeId: string) {
    if (pendingPointsRef.current.length === 0) return;
    send({ t: "duel-points", strokeId, points: pendingPointsRef.current });
    pendingPointsRef.current = [];
  }

  function scheduleFlush(strokeId: string) {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      flush(strokeId);
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const point = pointFromPointerEvent(canvas, event.clientX, event.clientY);
    activeStrokeIdRef.current = id;
    setMyStrokes((prev) => [...prev, { id, color: INK_COLOR, points: [point] }]);
    send({ t: "duel-points", strokeId: id, points: [point] });
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const id = activeStrokeIdRef.current;
    const canvas = canvasRef.current;
    if (!id || !canvas) return;
    const point = pointFromPointerEvent(canvas, event.clientX, event.clientY);
    setMyStrokes((prev) => prev.map((stroke) => (stroke.id === id ? { ...stroke, points: [...stroke.points, point] } : stroke)));
    pendingPointsRef.current.push(point);
    scheduleFlush(id);
  }

  function handlePointerUp() {
    const id = activeStrokeIdRef.current;
    if (!id) return;
    activeStrokeIdRef.current = null;
    flush(id);
  }

  function clearDrawing() {
    setMyStrokes([]);
    send({ t: "duel-clear" });
  }

  return {
    hasStarted,
    phase,
    round: roundIndex,
    totalRounds,
    isMyTurnToDraw,
    isLastRound,
    word,
    canvasRef,
    myStrokes,
    peerStrokes,
    guesses,
    remainingMs,
    rounds,
    lastRound,
    startDrawerPrep,
    confirmStartDrawing,
    goToNextRound,
    replay,
    submitGuess,
    clearDrawing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

export type UseDuelSessionReturn = ReturnType<typeof useDuelSession>;
