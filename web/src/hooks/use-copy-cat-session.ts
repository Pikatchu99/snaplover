"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { captureFrame } from "@/lib/capture/capture-frame";
import { waitForVideoReady } from "@/lib/capture/wait-for-video-ready";
import type { CopyCatMessage } from "@/types/copy-cat-realtime";
import type { CopyCatPhase, CopyCatRole, CopyCatRoundResult, CopyCatVerdict } from "@/types/copy-cat";

interface UseCopyCatSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
}

// Qui pose cette manche — pure fonction de la parité de l'index, jamais
// transmise (même principe que `drawerIsInitiatorForRound` de Doodle Duel).
function poserIsInitiatorForRound(round: number): boolean {
  return round % 2 === 0;
}

// Orchestration d'une partie Copy Cat : à chaque manche, un·e seul·e pose
// (sa propre caméra, aucun chrono, un bouton "Capture" manuel — voir
// CLAUDE.md "Copy Cat", la leçon inverse du 3·2·1 raté de Duo Doodle),
// l'autre reproduit la pose à l'aide d'un calque fantôme semi-transparent
// puis capture à son tour. Seul·e le·la poseur·se note (Nailé / Presque /
// Pas tout à fait) — iel est la seule à connaître l'intention visée, même
// principe que le·la dessinateur·rice arbitre de Doodle Duel.
//
// Deux transferts d'image chunkés se succèdent PAR MANCHE (référence, puis
// tentative) sur le MÊME canal — jamais réutilisé lib/capture/image-transfer.ts
// (câblé en dur sur un seul transfert ambiant à la fois, voir
// types/copy-cat-realtime.ts) : le tampon de réception est tagué
// (round, role) et tout chunk qui ne correspond pas au tag actuellement
// attendu est silencieusement ignoré plutôt que de corrompre le tampon.
//
// Comme le reste de ce projet : le listener réseau est monté une seule fois
// (effet à deps [dataChannel]) et ne doit jamais lire une variable de state
// fermée par sa closure au montage — tout ce qu'il lit passe par une ref
// tenue à jour à côté du state correspondant.
export function useCopyCatSession({ dataChannel, isInitiator }: UseCopyCatSessionOptions) {
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<CopyCatPhase>("lobby");
  const [round, setRound] = useState(0);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [attemptUrl, setAttemptUrl] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<CopyCatVerdict | null>(null);
  const [rounds, setRounds] = useState<CopyCatRoundResult[]>([]);
  const [capturing, setCapturing] = useState(false);

  const roundRef = useRef(0);
  const advancedToRef = useRef(-1);
  const referenceUrlRef = useRef<string | null>(null);
  const attemptUrlRef = useRef<string | null>(null);
  const capturedForRoundRef = useRef<{ round: number; role: CopyCatRole } | null>(null);
  const roundsRef = useRef<CopyCatRoundResult[]>([]);

  const bufferRef = useRef("");
  const expectedTagRef = useRef<{ round: number; role: CopyCatRole } | null>(null);

  const isPoserThisRound = poserIsInitiatorForRound(round) === isInitiator;

  function send(message: CopyCatMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  function resetForRound() {
    referenceUrlRef.current = null;
    setReferenceUrl(null);
    attemptUrlRef.current = null;
    setAttemptUrl(null);
    setVerdict(null);
    capturedForRoundRef.current = null;
    bufferRef.current = "";
    expectedTagRef.current = null;
  }

  // Fait à la fois "lancer la manche 0" et "manche suivante" (voir
  // types/copy-cat-realtime.ts) — gardé par la cible elle-même plutôt que
  // par un `id` séparé : les index de manche sont déjà naturellement
  // monotones, une cible déjà atteinte ou dépassée est ignorée.
  function applyAdvance(targetRound: number) {
    if (targetRound <= advancedToRef.current) return;
    advancedToRef.current = targetRound;
    if (targetRound >= config.copyCat.rounds) {
      setPhase("recap");
      return;
    }
    roundRef.current = targetRound;
    setRound(targetRound);
    resetForRound();
    setPhase("posing");
  }

  function maybeReveal() {
    if (referenceUrlRef.current && attemptUrlRef.current) setPhase("reveal");
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as CopyCatMessage;

      if (message.t === "copycat-hello") {
        // Preuve que l'invité·e écoute — voir launch() côté hôte, qui
        // n'a pas besoin d'attendre ce message grâce au clic humain
        // explicite (voir types/copy-cat-realtime.ts pour le raisonnement
        // complet). Rien à faire ici au-delà de la réception elle-même.
      } else if (message.t === "copycat-advance") {
        setHasStarted(true);
        applyAdvance(message.round);
      } else if (message.t === "copycat-img-meta") {
        bufferRef.current = "";
        expectedTagRef.current = { round: message.round, role: message.role };
      } else if (message.t === "copycat-img-chunk") {
        bufferRef.current += message.part;
      } else if (message.t === "copycat-img-end") {
        const expected = expectedTagRef.current;
        if (!expected || expected.round !== message.round || expected.role !== message.role) return;
        const dataUrl = bufferRef.current;
        bufferRef.current = "";
        expectedTagRef.current = null;
        if (message.role === "poser") {
          // Ce message n'arrive jamais chez le·la poseur·se lui/elle-même
          // (on ne reçoit jamais son propre envoi) — le recevoir prouve
          // donc qu'on est le·la mimic de cette manche, sans avoir besoin
          // de vérifier isPoserThisRound ici.
          referenceUrlRef.current = dataUrl;
          setReferenceUrl(dataUrl);
          setPhase("mimic-prep");
        } else {
          attemptUrlRef.current = dataUrl;
          setAttemptUrl(dataUrl);
        }
        maybeReveal();
      } else if (message.t === "copycat-rate") {
        if (message.round !== roundRef.current) return;
        setVerdict(message.verdict);
        const result: CopyCatRoundResult = {
          round: message.round,
          referenceUrl: referenceUrlRef.current!,
          attemptUrl: attemptUrlRef.current!,
          verdict: message.verdict,
        };
        roundsRef.current = [...roundsRef.current, result];
        setRounds(roundsRef.current);
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    if (!isInitiator) send({ t: "copycat-hello" });
    return () => dataChannel.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel]);

  function sendImage(role: CopyCatRole, dataUrl: string) {
    const currentRound = roundRef.current;
    send({ t: "copycat-img-meta", round: currentRound, role });
    const chunkSize = config.imageTransfer.chunkSize;
    for (let i = 0; i < dataUrl.length; i += chunkSize) {
      send({ t: "copycat-img-chunk", part: dataUrl.slice(i, i + chunkSize) });
    }
    send({ t: "copycat-img-end", round: currentRound, role });
  }

  // Lancement (hôte uniquement, voir CopyCatLobby.tsx) — l'hôte est
  // toujours poseur·se de la manche 0 (poserIsInitiatorForRound(0) est
  // vrai). Pas besoin d'attendre "copycat-hello" avant d'envoyer : le clic
  // humain qui déclenche cette fonction garantit déjà que l'invité·e
  // écoute depuis longtemps.
  function launch() {
    setHasStarted(true);
    roundsRef.current = [];
    setRounds([]);
    advancedToRef.current = -1;
    send({ t: "copycat-advance", round: 0 });
    applyAdvance(0);
  }

  // Capture manuelle — jamais de chrono (voir CLAUDE.md "Copy Cat").
  // Gardée contre un double-clic avant que le premier envoi soit terminé
  // (capturedForRoundRef) : sinon un second copycat-img-meta pourrait
  // arriver en pleine reconstruction du premier chez l'autre côté.
  async function capture(video: HTMLVideoElement, role: CopyCatRole) {
    const current = capturedForRoundRef.current;
    if (current && current.round === roundRef.current && current.role === role) return;
    capturedForRoundRef.current = { round: roundRef.current, role };
    setCapturing(true);
    await waitForVideoReady(video);
    // Toujours dé-miroré des DEUX côtés (contrairement au flux photo de
    // base qui ne dé-miroir que l'hôte) : la donnée stockée doit être en
    // vraie orientation pour les deux rôles, pour une notation/un export
    // équitables — voir CLAUDE.md.
    const dataUrl = captureFrame(video, { mirrored: true });
    setCapturing(false);
    if (role === "poser") {
      referenceUrlRef.current = dataUrl;
      setReferenceUrl(dataUrl);
      setPhase("mimic-prep");
    } else {
      attemptUrlRef.current = dataUrl;
      setAttemptUrl(dataUrl);
      maybeReveal();
    }
    sendImage(role, dataUrl);
  }

  // Poseur·se uniquement — seul·e à connaître l'intention visée, même
  // principe que l'arbitrage du·de la dessinateur·rice de Doodle Duel.
  function rate(verdict: CopyCatVerdict) {
    if (!isPoserThisRound || phase !== "reveal") return;
    setVerdict(verdict);
    const result: CopyCatRoundResult = {
      round: roundRef.current,
      referenceUrl: referenceUrlRef.current!,
      attemptUrl: attemptUrlRef.current!,
      verdict,
    };
    roundsRef.current = [...roundsRef.current, result];
    setRounds(roundsRef.current);
    send({ t: "copycat-rate", round: roundRef.current, verdict });
  }

  // "Manche suivante"/"Voir le récap" — n'importe quel côté peut cliquer
  // une fois un verdict connu, jamais seulement le·la poseur·se.
  function continueAfterReveal() {
    const target = roundRef.current + 1;
    send({ t: "copycat-advance", round: target });
    applyAdvance(target);
  }

  // "Rejouer" — repart pour une partie fraîche sur la MÊME connexion, sans
  // recharger ni renégocier WebRTC. Repasse `hasStarted` à `false` (bug
  // réel déjà rencontré et corrigé sur Duo Quiz : sans ça, le client reste
  // coincé sur un écran de manche vide au lieu de revenir à la salle
  // d'attente).
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

  return {
    hasStarted,
    phase,
    round,
    totalRounds: config.copyCat.rounds,
    isPoserThisRound,
    referenceUrl,
    attemptUrl,
    verdict,
    rounds,
    capturing,
    launch,
    capture,
    rate,
    continueAfterReveal,
    replay,
  };
}

export type UseCopyCatSessionReturn = ReturnType<typeof useCopyCatSession>;
