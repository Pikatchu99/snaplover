"use client";

import { useEffect, useRef, useState } from "react";
import { checkWinner, isBoardFull, isColumnFull, type ConnectDuoMove } from "@/lib/connect-duo/board";
import type { ConnectDuoMessage } from "@/types/connect-duo-realtime";

interface UseConnectDuoSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

// Orchestration d'une partie Connect Duo (Puissance 4) — aucune information
// cachée, aucun hasard, aucune autorité à négocier : le plateau, le tour
// courant et la victoire/l'égalité sont TOUJOURS des fonctions pures du même
// log de coups partagé (voir lib/connect-duo/board.ts), jamais un verdict
// transmis séparément — contrairement à Doodle Duel/Word Sonar, qui doivent
// faire confiance à un côté pour juger une information secrète, ici il n'y
// a structurellement rien à arbitrer.
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour par un effet dédié.
export function useConnectDuoSession({ dataChannel, isInitiator }: UseConnectDuoSessionOptions) {
  const [hasStarted, setHasStarted] = useState(false);
  const [moves, setMoves] = useState<ConnectDuoMove[]>([]);
  const [peerReady, setPeerReady] = useState(isInitiator ? false : true);

  const movesRef = useRef<ConnectDuoMove[]>([]);
  const rematchIdRef = useRef(0);

  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  function send(message: ConnectDuoMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  function resetBoardForRematch(id: number) {
    rematchIdRef.current = id;
    setMoves([]);
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as ConnectDuoMessage;

      if (message.t === "connectduo-hello") {
        // Jamais hasStarted ici : ce message part dès la connexion, bien
        // avant que l'hôte ait cliqué "Lancer la partie" — sinon
        // l'invité·e verrait l'écran de jeu avant l'hôte.
        setPeerReady(true);
      } else if (message.t === "connectduo-start") {
        setHasStarted(true);
      } else if (message.t === "connectduo-move") {
        setHasStarted(true);
        // Un coup qui ne correspond pas au prochain index attendu (réémission
        // tardive, désordre, régression future) est silencieusement ignoré
        // plutôt que de faire confiance à l'expéditeur — le log de coups est
        // la seule source de vérité, il ne doit jamais s'écarter entre les
        // deux côtés.
        if (message.index !== movesRef.current.length) return;
        setMoves((prev) => [...prev, { column: message.column }]);
      } else if (message.t === "connectduo-rematch") {
        if (message.id > rematchIdRef.current) resetBoardForRematch(message.id);
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    // L'invité·e prouve que son listener est attaché — voir
    // types/connect-duo-realtime.ts "connectduo-hello".
    if (!isInitiator) send({ t: "connectduo-hello" });
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  const winner = checkWinner(moves);
  const boardFull = isBoardFull(moves);
  const phase = winner || boardFull ? "ended" : "playing";
  const isMyTurn = phase === "playing" && (moves.length % 2 === 0) === isInitiator;

  // Lancement (hôte uniquement, voir ConnectDuoLobby.tsx) — fait passer les
  // deux côtés de la salle d'attente à l'écran de jeu ensemble.
  function launch() {
    setHasStarted(true);
    send({ t: "connectduo-start" });
  }

  function dropDisc(column: number) {
    if (phase !== "playing" || !isMyTurn) return;
    if (isInitiator && !peerReady) return;
    if (isColumnFull(moves, column)) return;
    const index = moves.length;
    setMoves((prev) => [...prev, { column }]);
    send({ t: "connectduo-move", index, column });
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger la page ni renégocier WebRTC (même convention que les autres
  // jeux). L'hôte rejoue toujours en premier, comme au tout premier
  // lancement — pas d'alternance spéciale pour les rematchs.
  function rematch() {
    const nextId = rematchIdRef.current + 1;
    send({ t: "connectduo-rematch", id: nextId });
    resetBoardForRematch(nextId);
  }

  return {
    hasStarted,
    phase,
    moves,
    winner,
    isDraw: phase === "ended" && !winner,
    isMyTurn,
    launch,
    dropDisc,
    rematch,
  };
}

export type UseConnectDuoSessionReturn = ReturnType<typeof useConnectDuoSession>;
