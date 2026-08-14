"use client";

import { useEffect, useRef, useState } from "react";
import { isSameWord } from "@/lib/text/normalize-word";
import { config } from "@/lib/config";
import type { MindMatchMessage } from "@/types/mindmatch-realtime";
import type { MindMatchAttempt, MindMatchPhase, MindMatchRoundResult } from "@/types/mindmatch";

interface UseMindMatchSessionOptions {
  dataChannel: RTCDataChannel | null;
}

// Orchestration d'une partie Mind Match : `config.mindMatch.rounds` manches,
// chacune consistant à faire converger les deux joueur·euses sur le MÊME mot,
// en autant d'essais que nécessaire. Contrairement à Doodle Duel, les rôles
// sont parfaitement symétriques (personne ne "sait" quelque chose que
// l'autre ignore) — donc pas d'alternance à gérer, mais toujours la même
// précaution que le reste de ce projet : le listener réseau est monté une
// seule fois (effet à deps [dataChannel]) et ne doit jamais lire une variable
// de state fermée par sa closure au montage, tout ce qu'il lit passe par une
// ref tenue à jour par un effet dédié.
export function useMindMatchSession({ dataChannel }: UseMindMatchSessionOptions) {
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<MindMatchPhase>("lobby");
  const [roundIndex, setRoundIndex] = useState(0);
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [peerWord, setPeerWord] = useState<string | null>(null);
  const [converged, setConverged] = useState(false);
  const [attempts, setAttempts] = useState<MindMatchAttempt[]>([]);
  const [rounds, setRounds] = useState<MindMatchRoundResult[]>([]);

  // Garde contre le double-avancement — même bug de classe déjà rencontré et
  // corrigé côté Doodle Duel (voir types/duel-realtime.ts "duel-next-round") :
  // sans elle, un clic en double sur "Réessayer"/"Manche suivante" (ou les
  // deux pairs qui cliquent chacun sur leur écran à quelques centaines de ms
  // d'écart) désynchronise complètement les deux côtés. Remise à false à
  // chaque nouvelle révélation.
  const advancedRef = useRef(false);

  // Refs "dernière valeur connue" — tout ce que le listener réseau (effet
  // stable) doit lire passe par elles, jamais par le state directement.
  const roundIndexRef = useRef(0);
  const attemptIndexRef = useRef(0);
  const myWordRef = useRef<string | null>(null);
  const peerWordRef = useRef<string | null>(null);
  const convergedRef = useRef(false);
  useEffect(() => {
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);
  useEffect(() => {
    attemptIndexRef.current = attemptIndex;
  }, [attemptIndex]);
  useEffect(() => {
    myWordRef.current = myWord;
  }, [myWord]);
  useEffect(() => {
    peerWordRef.current = peerWord;
  }, [peerWord]);
  useEffect(() => {
    convergedRef.current = converged;
  }, [converged]);

  const totalRounds = config.mindMatch.rounds;
  const isLastRound = roundIndex >= totalRounds - 1;

  function send(message: MindMatchMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  // Révèle l'essai courant dès que les DEUX mots sont connus (peu importe
  // lequel des deux événements — ma propre soumission ou la réception du mot
  // de mon·ma partenaire — arrive en second). Les deux côtés calculent
  // `converged` indépendamment, mais de façon identique (comparaison pure),
  // donc jamais besoin de le faire transiter par le réseau.
  function maybeReveal() {
    if (myWordRef.current == null || peerWordRef.current == null) return;
    const isMatch = isSameWord(myWordRef.current, peerWordRef.current);
    advancedRef.current = false;
    setConverged(isMatch);
    setAttempts((prev) => [
      ...prev,
      { attempt: attemptIndexRef.current, myWord: myWordRef.current!, peerWord: peerWordRef.current!, converged: isMatch },
    ]);
    setPhase("reveal");
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as MindMatchMessage;
      setHasStarted(true);

      if (message.t === "mindmatch-start") {
        setPhase("guessing");
      } else if (message.t === "mindmatch-word") {
        if (message.round === roundIndexRef.current && message.attempt === attemptIndexRef.current) {
          peerWordRef.current = message.word;
          setPeerWord(message.word);
          maybeReveal();
        }
      } else if (message.t === "mindmatch-advance") {
        if (message.round === roundIndexRef.current && message.attempt === attemptIndexRef.current) applyAdvance();
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  function resetWordsForNextAttempt() {
    myWordRef.current = null;
    peerWordRef.current = null;
    setMyWord(null);
    setPeerWord(null);
  }

  // Applique le passage après une révélation (essai suivant dans la même
  // manche, ou manche suivante, ou récap si c'était la dernière) — appelé
  // soit directement par un clic local, soit à la réception du message
  // réseau envoyé par l'autre pair : quel que soit le déclencheur, les deux
  // côtés doivent obtenir exactement le même résultat, donc tout est lu
  // depuis des refs, jamais depuis une closure potentiellement obsolète.
  function applyAdvance() {
    if (advancedRef.current) return;
    advancedRef.current = true;

    if (convergedRef.current) {
      const result: MindMatchRoundResult = {
        round: roundIndexRef.current,
        word: myWordRef.current ?? "",
        attempts: attemptIndexRef.current + 1,
      };
      setRounds((prev) => [...prev, result]);

      if (roundIndexRef.current >= totalRounds - 1) {
        setPhase("recap");
        return;
      }
      setRoundIndex((prev) => prev + 1);
      setAttemptIndex(0);
      setAttempts([]);
      resetWordsForNextAttempt();
      setPhase("guessing");
    } else {
      setAttemptIndex((prev) => prev + 1);
      resetWordsForNextAttempt();
      setPhase("guessing");
    }
  }

  // Lancement de la partie (hôte uniquement, voir MindMatchLobby.tsx) — fait
  // passer les deux côtés de la salle d'attente à la manche 0.
  function launch() {
    setHasStarted(true);
    send({ t: "mindmatch-start" });
    setPhase("guessing");
  }

  function submitWord(text: string) {
    const trimmed = text.trim();
    if (!trimmed || myWordRef.current != null) return;
    myWordRef.current = trimmed;
    setMyWord(trimmed);
    send({ t: "mindmatch-word", round: roundIndexRef.current, attempt: attemptIndexRef.current, word: trimmed });
    maybeReveal();
  }

  function continueAfterReveal() {
    send({ t: "mindmatch-advance", round: roundIndexRef.current, attempt: attemptIndexRef.current });
    applyAdvance();
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger la page ni re-négocier WebRTC (même convention que Doodle Duel,
  // voir DuelRecap.tsx "Rejouer").
  function replay() {
    setRoundIndex(0);
    setAttemptIndex(0);
    setAttempts([]);
    setRounds([]);
    resetWordsForNextAttempt();
    setPhase("lobby");
  }

  return {
    hasStarted,
    phase,
    round: roundIndex,
    totalRounds,
    attempt: attemptIndex,
    isLastRound,
    myWord,
    peerWord,
    converged,
    attempts,
    rounds,
    launch,
    submitWord,
    continueAfterReveal,
    replay,
  };
}

export type UseMindMatchSessionReturn = ReturnType<typeof useMindMatchSession>;
