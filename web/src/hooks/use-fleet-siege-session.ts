"use client";

import { useEffect, useRef, useState } from "react";
import { cellKey, computeFireOutcome, shipCells } from "@/lib/fleet-siege/board";
import { canPlaceShip, isValidFleet, randomPlacement } from "@/lib/fleet-siege/placement";
import type { FleetSiegeMessage } from "@/types/fleet-siege-realtime";
import type { FleetSiegePhase, IncomingShot, OutgoingShot, ShipPlacement } from "@/types/fleet-siege";

interface UseFleetSiegeSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

type Side = "host" | "guest";

export interface RevealedShip {
  id: string;
  cells: { row: number; col: number }[];
}

// Qui tire en premier CE match — alterne à chaque "Rejouer" via le même
// compteur que la garde d'idempotence du rematch (voir CLAUDE.md "Fleet
// Siege" : "computed locally from a shared match counter, not networked
// separately", jamais un second compteur indépendant qui pourrait dériver).
function firstShooterForMatch(matchIndex: number): Side {
  return matchIndex % 2 === 0 ? "host" : "guest";
}

function shooterForShotIndex(shotIndex: number, matchIndex: number): Side {
  const first = firstShooterForMatch(matchIndex);
  const second: Side = first === "host" ? "guest" : "host";
  return shotIndex % 2 === 0 ? first : second;
}

// Orchestration d'une partie Fleet Siege (bataille navale). Contrairement à
// Connect Duo, il y a bien une information cachée (la flotte de chacun·e) —
// mais AUCUNE autorité à négocier pour autant : chaque plateau est la seule
// source de vérité de son propre propriétaire, qui calcule localement le
// verdict de chaque tir reçu et ne transmet jamais sa flotte tant que la
// partie est en cours (extension spatiale du principe déjà établi par Word
// Sonar — voir CLAUDE.md). Le tour, lui, est strictement alterné (le seul
// mécanisme du hub où le tour EST la règle, pas une gêne à éviter) : déduit
// de la parité du compteur de tirs partagé, jamais un message "à toi de
// jouer" séparé.
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour directement à côté du state correspondant.
export function useFleetSiegeSession({ dataChannel, isInitiator }: UseFleetSiegeSessionOptions) {
  const mySide: Side = isInitiator ? "host" : "guest";
  const peerSide: Side = isInitiator ? "guest" : "host";

  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<FleetSiegePhase>("lobby");
  const [matchIndex, setMatchIndex] = useState(0);
  const [myShips, setMyShips] = useState<ShipPlacement[]>([]);
  const [myReady, setMyReady] = useState(false);
  const [peerReady, setPeerReady] = useState(false);
  const [myShots, setMyShots] = useState<OutgoingShot[]>([]);
  const [peerShots, setPeerShots] = useState<IncomingShot[]>([]);
  const [awaitingResult, setAwaitingResult] = useState(false);
  const [peerRevealedShips, setPeerRevealedShips] = useState<RevealedShip[] | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);

  const matchIndexRef = useRef(0);
  const myShipsRef = useRef<ShipPlacement[]>([]);
  const myReadyRef = useRef(false);
  const peerReadyRef = useRef(false);
  const myShotsRef = useRef<OutgoingShot[]>([]);
  const peerShotsRef = useRef<IncomingShot[]>([]);
  const awaitingResultRef = useRef(false);
  const gameOverRef = useRef(false);

  function send(message: FleetSiegeMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  function resetForNewMatch(nextMatchIndex: number) {
    matchIndexRef.current = nextMatchIndex;
    setMatchIndex(nextMatchIndex);
    myShipsRef.current = [];
    setMyShips([]);
    myReadyRef.current = false;
    setMyReady(false);
    peerReadyRef.current = false;
    setPeerReady(false);
    myShotsRef.current = [];
    setMyShots([]);
    peerShotsRef.current = [];
    setPeerShots([]);
    awaitingResultRef.current = false;
    setAwaitingResult(false);
    gameOverRef.current = false;
    setWinner(null);
    setPeerRevealedShips(null);
  }

  function declareGameOver(winnerSide: Side) {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setWinner(winnerSide);
    setPhase("reveal");
    // Symétrique des deux côtés (gagnant·e ET perdant·e) — voir CLAUDE.md :
    // seul moment où un plateau complet traverse jamais le réseau, purement
    // cosmétique puisque l'issue est déjà tranchée.
    send({
      t: "siege-reveal-board",
      ships: myShipsRef.current.map((ship) => ({ id: ship.id, cells: shipCells(ship) })),
    });
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as FleetSiegeMessage;

      if (message.t === "siege-start") {
        setHasStarted(true);
        resetForNewMatch(0);
        setPhase("placement");
      } else if (message.t === "siege-ready") {
        peerReadyRef.current = true;
        setPeerReady(true);
        if (myReadyRef.current) setPhase("battle");
      } else if (message.t === "siege-fire") {
        // Défense : le tir doit correspondre exactement au prochain index
        // attendu ET appartenir au tour de l'adversaire — sinon ignoré
        // silencieusement (tir dupliqué/désordonné, pas un mécanisme de
        // confiance, voir CLAUDE.md).
        const expectedIndex = myShotsRef.current.length + peerShotsRef.current.length;
        if (message.shotIndex !== expectedIndex) return;
        if (shooterForShotIndex(message.shotIndex, matchIndexRef.current) !== peerSide) return;

        const hitsSoFar = new Set(
          peerShotsRef.current.filter((shot) => shot.result === "hit").map((shot) => cellKey(shot.row, shot.col)),
        );
        const outcome = computeFireOutcome(myShipsRef.current, hitsSoFar, message.row, message.col);
        const incoming: IncomingShot = { shotIndex: message.shotIndex, row: message.row, col: message.col, result: outcome.result };
        peerShotsRef.current = [...peerShotsRef.current, incoming];
        setPeerShots(peerShotsRef.current);
        send({
          t: "siege-fire-result",
          row: message.row,
          col: message.col,
          shotIndex: message.shotIndex,
          result: outcome.result,
          sunkShip: outcome.sunkShip,
          gameOver: outcome.gameOver,
        });
        if (outcome.gameOver) declareGameOver(peerSide);
      } else if (message.t === "siege-fire-result") {
        const expectedIndex = myShotsRef.current.length + peerShotsRef.current.length;
        if (message.shotIndex !== expectedIndex) return;
        const outgoing: OutgoingShot = {
          shotIndex: message.shotIndex,
          row: message.row,
          col: message.col,
          result: message.result,
          sunkShip: message.sunkShip,
        };
        myShotsRef.current = [...myShotsRef.current, outgoing];
        setMyShots(myShotsRef.current);
        awaitingResultRef.current = false;
        setAwaitingResult(false);
        if (message.gameOver) declareGameOver(mySide);
      } else if (message.t === "siege-reveal-board") {
        setPeerRevealedShips(message.ships);
      } else if (message.t === "siege-rematch") {
        if (message.id > matchIndexRef.current) {
          resetForNewMatch(message.id);
          setPhase("placement");
        }
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  // Lancement (hôte uniquement, voir FleetSiegeLobby.tsx) — aucune config à
  // communiquer, la grille et les tailles de navires viennent de config.ts,
  // partagées par construction sans jamais être négociées sur le réseau.
  function launch() {
    setHasStarted(true);
    resetForNewMatch(0);
    send({ t: "siege-start" });
    setPhase("placement");
  }

  function placeShip(ship: ShipPlacement) {
    if (!canPlaceShip(ship, myShipsRef.current)) return;
    const withoutSameLength = myShipsRef.current.filter((existing) => existing.length !== ship.length);
    myShipsRef.current = [...withoutSameLength, ship];
    setMyShips(myShipsRef.current);
  }

  function removeShipAt(row: number, col: number) {
    const key = cellKey(row, col);
    const remaining = myShipsRef.current.filter((ship) => !shipCells(ship).some((cell) => cellKey(cell.row, cell.col) === key));
    myShipsRef.current = remaining;
    setMyShips(remaining);
  }

  function randomizeFleet() {
    myShipsRef.current = randomPlacement();
    setMyShips(myShipsRef.current);
  }

  // Verrouille la flotte (voir types/fleet-siege-realtime.ts "siege-ready") —
  // la transition vers la bataille exige le ET des deux côtés, jamais "j'ai
  // envoyé le mien donc je démarre".
  function confirmFleet() {
    if (!isValidFleet(myShipsRef.current)) return;
    myReadyRef.current = true;
    setMyReady(true);
    send({ t: "siege-ready" });
    if (peerReadyRef.current) setPhase("battle");
  }

  const nextShotIndex = myShots.length + peerShots.length;
  const isMyTurn = phase === "battle" && !awaitingResult && shooterForShotIndex(nextShotIndex, matchIndex) === mySide;

  function fireAt(row: number, col: number) {
    if (!isMyTurn) return;
    if (myShotsRef.current.some((shot) => shot.row === row && shot.col === col)) return;
    awaitingResultRef.current = true;
    setAwaitingResult(true);
    send({ t: "siege-fire", row, col, shotIndex: nextShotIndex });
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger la page ni renégocier WebRTC ; qui tire en premier alterne à
  // chaque match (voir firstShooterForMatch), jamais renégocié explicitement.
  function rematch() {
    const nextId = matchIndexRef.current + 1;
    send({ t: "siege-rematch", id: nextId });
    resetForNewMatch(nextId);
    setPhase("placement");
  }

  return {
    hasStarted,
    phase,
    mySide,
    peerSide,
    myShips,
    myReady,
    peerReady,
    myShots,
    peerShots,
    awaitingResult,
    isMyTurn,
    winner,
    peerRevealedShips,
    launch,
    placeShip,
    removeShipAt,
    randomizeFleet,
    confirmFleet,
    fireAt,
    rematch,
  };
}

export type UseFleetSiegeSessionReturn = ReturnType<typeof useFleetSiegeSession>;
