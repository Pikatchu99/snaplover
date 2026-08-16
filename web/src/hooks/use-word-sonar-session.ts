"use client";

import { useEffect, useRef, useState } from "react";
import { isSameWord } from "@/lib/text/normalize-word";
import { config } from "@/lib/config";
import type { WordSonarMessage } from "@/types/word-sonar-realtime";
import type { WordSonarPhase, WordSonarResult } from "@/types/word-sonar";

interface UseWordSonarSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
  /** Voir hooks/use-room-connection.ts — null tant que non résolu. */
  connectionType: "direct" | "relay" | null;
}

// Orchestration d'une partie Word Sonar : chacun·e choisit un mot secret,
// puis la vraie conversation ("as-tu telle lettre ? à quelle position ?")
// se passe À L'ORAL entre les deux joueur·euses (caméra/micro déjà branchés
// via FaceBubbles.tsx) — l'app n'a aucun protocole pour ça. Son seul rôle
// pendant la partie : laisser chacun·e tenter le mot entier à tout moment
// (jamais soumis à un tour, voir guessWord ci-dessous) et, une fois la
// partie terminée, révéler les deux mots des deux côtés.
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour par un effet dédié.
export function useWordSonarSession({ dataChannel, isInitiator, connectionType }: UseWordSonarSessionOptions) {
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<WordSonarPhase>("lobby");
  // Incrémenté à chaque nouvelle partie (voir resetForNewGame) — utilisé
  // comme clé de remontage de WordSonarRoundStage (WordSonarClient.tsx) pour
  // repartir d'un état local UI vierge (cases de tentative) après "Rejouer".
  const [gameId, setGameId] = useState(0);
  const [length, setLength] = useState<number>(config.wordSonar.defaultLength);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [myWordReady, setMyWordReady] = useState(false);
  const [peerWordReady, setPeerWordReady] = useState(false);
  const [awaitingResult, setAwaitingResult] = useState(false);
  const [gameRemainingMs, setGameRemainingMs] = useState<number>(config.wordSonar.gameDurationMs);
  const [result, setResult] = useState<WordSonarResult | null>(null);

  const lengthRef = useRef<number>(config.wordSonar.defaultLength);
  const myWordRef = useRef<string | null>(null);
  const myWordReadyRef = useRef(false);
  const peerWordReadyRef = useRef(false);
  const awaitingResultRef = useRef(false);
  const connectionTypeRef = useRef(connectionType);
  const triedWordsRef = useRef<Set<string>>(new Set());
  const gameDeadlineRef = useRef(0);
  // Garde unique contre toute double-résolution de fin de partie (victoire
  // ET timeout pourraient en théorie se chevaucher de quelques ms) — une
  // fois vraie, plus aucun message de fin n'est traité une seconde fois.
  const gameEndedRef = useRef(false);

  useEffect(() => {
    lengthRef.current = length;
  }, [length]);
  useEffect(() => {
    connectionTypeRef.current = connectionType;
  }, [connectionType]);

  function send(message: WordSonarMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  // Chrono global de partie — actif UNIQUEMENT sur une connexion relayée
  // (voir CLAUDE.md "Word Sonar" : borne le coût du relais TURN, ne rythme
  // pas la partie elle-même, qui se joue à l'oral). Les deux côtés tick
  // localement à partir du même instant logique (l'entrée en phase
  // "playing", quasi simultanée des deux côtés), mais seul l'hôte déclare
  // le timeout — jamais les deux, pour éviter toute course sur un léger
  // décalage d'horloge entre les deux navigateurs.
  function tickGameClock() {
    if (gameEndedRef.current) return;
    const remain = gameDeadlineRef.current - Date.now();
    setGameRemainingMs(Math.max(0, remain));
    if (remain <= 0) {
      if (isInitiator) declareTimeout();
      return;
    }
    requestAnimationFrame(tickGameClock);
  }

  function declareTimeout() {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    send({ t: "wordsonar-timeout" });
    send({ t: "wordsonar-reveal", word: myWordRef.current ?? "" });
    setResult({ outcome: "draw", myWord: myWordRef.current ?? "", peerWord: null });
    setPhase("ended");
  }

  function maybeStartPlaying() {
    if (!myWordReadyRef.current || !peerWordReadyRef.current) return;
    setPhase("playing");
    if (connectionTypeRef.current === "relay") {
      gameDeadlineRef.current = Date.now() + config.wordSonar.gameDurationMs;
      setGameRemainingMs(config.wordSonar.gameDurationMs);
      tickGameClock();
    }
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as WordSonarMessage;
      setHasStarted(true);

      if (message.t === "wordsonar-start") {
        lengthRef.current = message.length;
        setLength(message.length);
        resetForNewGame();
        setPhase("picking");
      } else if (message.t === "wordsonar-word-ready") {
        peerWordReadyRef.current = true;
        setPeerWordReady(true);
        maybeStartPlaying();
      } else if (message.t === "wordsonar-guess-word") {
        if (gameEndedRef.current) return;
        // Je réponds : calculé à partir de MON mot, jamais transmis en clair.
        const correct = isSameWord(message.word, myWordRef.current ?? "");
        send({ t: "wordsonar-guess-result", word: message.word, correct });
        if (correct) {
          gameEndedRef.current = true;
          setResult({ outcome: "lost", myWord: myWordRef.current ?? "", peerWord: null });
          setPhase("ended");
        }
      } else if (message.t === "wordsonar-guess-result") {
        awaitingResultRef.current = false;
        setAwaitingResult(false);
        if (gameEndedRef.current) return;
        if (message.correct) {
          gameEndedRef.current = true;
          send({ t: "wordsonar-reveal", word: myWordRef.current ?? "" });
          setResult({ outcome: "won", myWord: myWordRef.current ?? "", peerWord: message.word });
          setPhase("ended");
        }
      } else if (message.t === "wordsonar-reveal") {
        // Complète la révélation côté perdant·e (ou des deux côtés en cas de
        // match nul) — indépendant de gameEndedRef, c'est justement le
        // message qui suit une fin de partie déjà déclarée localement.
        setResult((prev) => (prev ? { ...prev, peerWord: message.word } : prev));
      } else if (message.t === "wordsonar-timeout") {
        declareTimeout();
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  function resetForNewGame() {
    myWordRef.current = null;
    setMyWord(null);
    myWordReadyRef.current = false;
    setMyWordReady(false);
    peerWordReadyRef.current = false;
    setPeerWordReady(false);
    awaitingResultRef.current = false;
    setAwaitingResult(false);
    triedWordsRef.current = new Set();
    gameEndedRef.current = false;
    setResult(null);
    setGameRemainingMs(config.wordSonar.gameDurationMs);
    setGameId((id) => id + 1);
  }

  // Lancement (hôte uniquement, voir WordSonarLobby.tsx) — communique la
  // longueur de mot choisie.
  function launch(chosenLength: number) {
    setHasStarted(true);
    lengthRef.current = chosenLength;
    setLength(chosenLength);
    resetForNewGame();
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

  // Contrairement à un jeu à tour comme Doodle Duel, une tentative de mot
  // entier n'attend JAMAIS de tour — retour utilisateur réel après test :
  // quelqu'un ayant déjà déduit le mot (à l'oral) devait attendre le tour de
  // l'autre avant de pouvoir valider sa réponse, alors qu'en vrai on "lâche
  // la réponse" dès qu'on la connaît. Seuls `awaitingResult` (un aller-
  // retour réseau à la fois) et `triedWordsRef` (jamais retenter deux fois
  // le même mot) protègent cette action.
  function guessWord(word: string) {
    if (gameEndedRef.current || awaitingResultRef.current) return;
    const trimmed = word.trim().toUpperCase();
    if (trimmed.length !== lengthRef.current || triedWordsRef.current.has(trimmed)) return;
    triedWordsRef.current.add(trimmed);
    awaitingResultRef.current = true;
    setAwaitingResult(true);
    send({ t: "wordsonar-guess-word", word: trimmed });
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger la page ni renégocier WebRTC (même convention que les autres
  // jeux). Repasse par "lobby" : la longueur du mot redevient un choix de
  // l'hôte, comme au tout premier lancement.
  function replay() {
    resetForNewGame();
    setPhase("lobby");
  }

  return {
    hasStarted,
    phase,
    gameId,
    length,
    myWord,
    myWordReady,
    peerWordReady,
    awaitingResult,
    /** Le chrono n'a de sens que sur une connexion relayée — voir uiNotes. */
    isRelayTimed: connectionType === "relay",
    gameRemainingMs,
    result,
    launch,
    submitWord,
    guessWord,
    replay,
  };
}

export type UseWordSonarSessionReturn = ReturnType<typeof useWordSonarSession>;
