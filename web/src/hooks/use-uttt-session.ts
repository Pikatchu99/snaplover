"use client";

import { useEffect, useRef, useState } from "react";
import { isLegalMove, symbolForMoveIndex } from "@/lib/uttt/win-check";
import type { UtttMessage } from "@/types/uttt-realtime";
import type { UtttMove, UtttPhase, UtttSymbol } from "@/types/uttt";

interface UseUtttSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
  /** Passe à `true` une fois que CE client a fini son propre tutoriel de
   * règles (voir components/uttt/UtttTutorial.tsx) — tant que c'est
   * `false`, ce côté n'annonce jamais son "uttt-ready", donc la partie
   * n'a aucune chance de démarrer avant que les deux aient vu les règles,
   * quel que soit le temps que ça prend de son côté. */
  readyToStart: boolean;
}

// Renvoyé toutes les READY_RETRY_MS tant que le "ready" du partenaire n'est
// pas reçu — voir le commentaire sur "uttt-ready" dans
// types/uttt-realtime.ts : un envoi one-shot instantané des DEUX côtés a la
// même course que le hello/config historique si les deux listeners ne
// s'attachent pas exactement au même instant ; ce renvoi court garantit une
// convergence en quelques centaines de ms dans le pire cas, sans jamais
// bloquer indéfiniment.
const READY_RETRY_MS = 250;
// ~5s de tentatives — largement suffisant pour couvrir le délai d'ouverture
// réel du data channel (quasi instantané une fois la connexion ICE établie
// dans la pratique), voir le commentaire sur retryInterval plus bas pour la
// raison de ne PAS conditionner l'arrêt à la réception du ready adverse.
const READY_RETRY_ATTEMPTS = 20;

// Orchestration d'une partie Ultimate Tic-Tac-Toe — AUCUNE information
// cachée (contrairement à Doodle Duel/Word Sonar/Fleet Siege) : le plateau
// entier est public des deux côtés en permanence, donc aucune autorité à
// négocier pour la légalité des coups ou la détection de victoire — les
// deux côtés font tourner EXACTEMENT les mêmes fonctions pures importées de
// lib/uttt/win-check.ts sur leur propre copie du même log de coups partagé
// (voir CLAUDE.md "Ultimate Tic-Tac-Toe"). Symbole/premier·ère à jouer :
// l'hôte est toujours X et joue toujours en premier, jamais renégocié,
// jamais transmis (même convention que la parité de Doodle Duel).
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour à côté du state correspondant.
export function useUtttSession({ dataChannel, isInitiator, readyToStart }: UseUtttSessionOptions) {
  const mySymbol: UtttSymbol = isInitiator ? "X" : "O";

  const [phase, setPhase] = useState<UtttPhase>("lobby");
  const [moves, setMoves] = useState<UtttMove[]>([]);

  const movesRef = useRef<UtttMove[]>([]);
  const myReadyRef = useRef(false);
  const peerReadyRef = useRef(false);
  const rematchIdRef = useRef(0);

  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  function send(message: UtttMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  function maybeStart() {
    if (myReadyRef.current && peerReadyRef.current) setPhase("playing");
  }

  function resetForRematch(id: number) {
    rematchIdRef.current = id;
    movesRef.current = [];
    setMoves([]);
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as UtttMessage;

      if (message.t === "uttt-ready") {
        peerReadyRef.current = true;
        maybeStart();
      } else if (message.t === "uttt-move") {
        // Idempotence/ordre : le coup doit correspondre exactement au
        // prochain index attendu, ET être légal selon la MÊME fonction
        // pure que l'expéditeur a déjà utilisée avant d'envoyer — sinon
        // ignoré silencieusement (jamais "réparé" à la volée, voir
        // types/uttt-realtime.ts).
        if (message.moveIndex !== movesRef.current.length) return;
        if (!isLegalMove(movesRef.current, message.boardIndex, message.cellIndex)) return;
        const next = [...movesRef.current, { boardIndex: message.boardIndex, cellIndex: message.cellIndex }];
        movesRef.current = next;
        setMoves(next);
      } else if (message.t === "uttt-rematch") {
        if (message.id > rematchIdRef.current) resetForRematch(message.id);
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
  }, [dataChannel]);

  // Annonce ma propre disponibilité — dans un effet SÉPARÉ de l'écoute
  // ci-dessus (qui reste toujours active dès que le data channel existe,
  // pour ne jamais rater le "ready" de l'autre pendant que je lis encore
  // mon propre tutoriel) : je ne commence à envoyer/renvoyer "uttt-ready"
  // qu'une fois `readyToStart` vrai, c'est-à-dire une fois que J'AI
  // moi-même fini mon tutoriel — combiné à l'autre côté qui fait de même,
  // la partie ne peut structurellement jamais démarrer avant que les deux
  // aient vu les règles.
  useEffect(() => {
    if (!dataChannel || !readyToStart) return;

    myReadyRef.current = true;
    send({ t: "uttt-ready" });
    // Le nombre de tentatives est borné (~READY_RETRY_ATTEMPTS x
    // READY_RETRY_MS) mais JAMAIS conditionné à "j'ai déjà reçu le ready du
    // partenaire" — recevoir le ready de l'autre ne prouve rien sur le fait
    // que MON PROPRE ready lui soit bien parvenu (aucun accusé de
    // réception dans ce protocole). Un premier envoi tenté avant que le
    // data channel soit réellement "open" (silencieusement abandonné par
    // send(), voir plus haut) serait sinon perdu pour de bon si on
    // arrêtait de réessayer dès la réception du ready adverse — bug réel
    // trouvé en écrivant ce hook : le·la premier·ère à recevoir le ready de
    // l'autre arrêtait ses propres tentatives avant même d'avoir réussi à
    // envoyer la sienne.
    let attempts = 0;
    const retryInterval = setInterval(() => {
      attempts += 1;
      send({ t: "uttt-ready" });
      if (attempts >= READY_RETRY_ATTEMPTS) clearInterval(retryInterval);
    }, READY_RETRY_MS);

    return () => clearInterval(retryInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel, readyToStart]);

  const currentTurn = symbolForMoveIndex(moves.length);
  const isMyTurn = phase === "playing" && currentTurn === mySymbol;

  // Verrouille un coup localement (optimiste, pas d'attente de round-trip
  // pour un ressenti réactif) — la même porte isLegalMove() que la
  // revalidation côté réception, jamais deux copies de la règle.
  function playMove(boardIndex: number, cellIndex: number) {
    if (!isMyTurn) return;
    if (!isLegalMove(movesRef.current, boardIndex, cellIndex)) return;
    const moveIndex = movesRef.current.length;
    const next = [...movesRef.current, { boardIndex, cellIndex }];
    movesRef.current = next;
    setMoves(next);
    send({ t: "uttt-move", boardIndex, cellIndex, moveIndex });
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger ni renégocier WebRTC. L'hôte reste X, l'invité·e reste O
  // (jamais renégocié, même convention que Fleet Siege/Connect Duo).
  function rematch() {
    const nextId = rematchIdRef.current + 1;
    send({ t: "uttt-rematch", id: nextId });
    resetForRematch(nextId);
  }

  return {
    phase,
    mySymbol,
    moves,
    isMyTurn,
    playMove,
    rematch,
  };
}

export type UseUtttSessionReturn = ReturnType<typeof useUtttSession>;
