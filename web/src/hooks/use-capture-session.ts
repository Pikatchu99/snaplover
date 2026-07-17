"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RealtimeChannel } from "@/lib/realtime/channel";
import { respondToPing, startClockSync } from "@/lib/realtime/clock-sync";
import { computeCaptureDelay } from "@/lib/realtime/schedule-capture";
import { captureFrame } from "@/lib/capture/capture-frame";
import { waitForVideoReady } from "@/lib/capture/wait-for-video-ready";
import { createImageReceiver, sendImage } from "@/lib/capture/image-transfer";
import { composeStrip, type StripCell } from "@/lib/capture/compose-strip";
import { formatFooterDate } from "@/lib/capture/format-footer-date";
import { playShutter } from "@/lib/audio/sound-effects";
import { FRAMES } from "@/lib/frames/frame-registry";
import { config } from "@/lib/config";
import type { FrameId, StripStyle } from "@/types/frame";

export type CaptureSessionStatus = "idle" | "countdown" | "capturing" | "composing" | "done";

interface UseCaptureSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
  poses: number;
  frameId: FrameId;
  style: StripStyle;
  /** Prénom local (résolu avec fallback avant d'arriver ici — voir RoomClient). */
  myName: string;
  localVideoRef: RefObject<HTMLVideoElement | null>;
}

// Orchestration d'une séance : clock-sync, déclenchement synchronisé
// multi-poses, capture locale, échange et composition de la bande.
// Voir SNAPROOM-SPEC.md §9-§10.
export function useCaptureSession({
  dataChannel,
  isInitiator,
  poses,
  frameId,
  style,
  myName,
  localVideoRef,
}: UseCaptureSessionOptions) {
  const tParticipant = useTranslations("participant");
  const tStrip = useTranslations("strip");
  const locale = useLocale();
  const [status, setStatus] = useState<CaptureSessionStatus>("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [currentPose, setCurrentPose] = useState(0);
  const [countdownMs, setCountdownMs] = useState(0);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [cells, setCells] = useState<StripCell[]>([]);
  const [captureDeltasMs, setCaptureDeltasMs] = useState<number[]>([]);
  // true tant que l'hôte a une pose à déclencher mais que le data channel
  // n'est pas disponible (partenaire pas encore prêt, ou déconnecté en cours
  // de séance) — alimente l'overlay "on attend Partenaire" / "Partenaire
  // déconnecté·e" côté UI (CaptureStage).
  const [awaitingPeer, setAwaitingPeer] = useState(false);
  const hasStartedRef = useRef(false);
  const currentPoseRef = useRef(0);
  const pendingPoseRef = useRef<number | null>(null);

  // L'invité peut arriver via un code saisi (sans les query params de
  // l'hôte) — l'hôte diffuse sa config à la connexion et fait autorité.
  // Refs (pas seulement du state) : le dispatcher de messages du data
  // channel est câblé une seule fois (l'effet ne dépend que de
  // [dataChannel, isInitiator]) — s'il ne lisait que des variables de state
  // fermées par closure, il resterait bloqué sur leur valeur au moment du
  // montage. Les refs garantissent que tryComposeCell lit toujours la
  // dernière config reçue, quelle que soit l'ancienneté de la closure qui
  // l'appelle.
  const [effectivePoses, setEffectivePosesState] = useState(poses);
  const [effectiveFrameId, setEffectiveFrameIdState] = useState(frameId);
  const [effectiveStyle, setEffectiveStyleState] = useState(style);
  const effectivePosesRef = useRef(poses);
  const effectiveFrameIdRef = useRef(frameId);
  const effectiveStyleRef = useRef(style);

  function applyConfig(nextPoses: number, nextFrameId: FrameId, nextStyle: StripStyle) {
    effectivePosesRef.current = nextPoses;
    effectiveFrameIdRef.current = nextFrameId;
    effectiveStyleRef.current = nextStyle;
    setEffectivePosesState(nextPoses);
    setEffectiveFrameIdState(nextFrameId);
    setEffectiveStyleState(nextStyle);
  }

  const channelRef = useRef<RealtimeChannel | null>(null);
  const offsetRef = useRef(0);
  const cellsRef = useRef<StripCell[]>([]);
  const myHalfRef = useRef<string | null>(null);
  const myCaptureHostTimeRef = useRef<number | null>(null);
  const peerHalfRef = useRef<string | null>(null);
  const peerCaptureHostTimeRef = useRef<number | null>(null);
  // Prénom du partenaire, reçu via "hello" (côté hôte) ou "config" (côté
  // invité) — voir protocole ci-dessous. Ref (pas state) : seul lu au moment
  // de composer la bande finale, pas besoin de re-render.
  const peerNameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dataChannel) return;

    const channel = new RealtimeChannel(dataChannel);
    channelRef.current = channel;

    const receiveImage = createImageReceiver(({ pose, dataUrl, hostTime }) => {
      peerHalfRef.current = dataUrl;
      peerCaptureHostTimeRef.current = hostTime;
      tryComposeCell(pose);
    });

    const unsubscribeMessages = channel.onMessage((message) => {
      if (message.t === "ping") respondToPing(channel, message.c);
      else if (message.t === "hello") {
        // L'invité vient de prouver que son listener est attaché : on peut
        // lui envoyer la config sans risque de course. C'est aussi le seul
        // moment sûr pour relancer une pose en attente (countdown suspendu /
        // reconnexion) — se fier à l'ouverture du data channel de l'hôte
        // seule (channel.onOpen) ne garantit pas que le listener du
        // partenaire (potentiellement une instance toute neuve après une
        // coupure) est déjà attaché côté React à ce moment précis.
        peerNameRef.current = message.name;
        if (isInitiator) {
          channel.send({ t: "config", poses, frameId, style, hostName: myName });
          if (pendingPoseRef.current != null) triggerCapture(pendingPoseRef.current);
        }
      } else if (message.t === "config") {
        applyConfig(message.poses, message.frameId, message.style);
        peerNameRef.current = message.hostName;
      } else if (message.t === "capture") scheduleCapture(message.pose, message.fireAtHost);
      else receiveImage(message);
    });

    let stopClockSync: (() => void) | undefined;
    channel.onOpen(() => {
      if (!isInitiator) {
        channel.send({ t: "hello", name: myName });
        stopClockSync = startClockSync(channel, (sample) => {
          offsetRef.current = sample.offset;
        });
      }
      // Côté hôte : rien à faire ici — la reprise d'une pose en attente se
      // fait dans le handler "hello" ci-dessus, pas sur l'ouverture du canal
      // (voir commentaire associé).
    });

    return () => {
      unsubscribeMessages();
      stopClockSync?.();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel, isInitiator]);

  useEffect(() => {
    hasStartedRef.current = hasStarted;
  }, [hasStarted]);

  useEffect(() => {
    currentPoseRef.current = currentPose;
  }, [currentPose]);

  useEffect(() => {
    // Le data channel disparaît (partenaire déconnecté) alors qu'une séance
    // est en cours : bascule immédiatement en "on attend Partenaire" plutôt
    // que d'attendre le prochain essai de déclenchement. Toute moitié déjà
    // capturée pour la pose en cours est invalidée (le partenaire reconnecté
    // repart d'un état neuf, sans mémoire de cette pose) — sinon on resterait
    // bloqué à vie en attendant une moitié qui n'arrivera jamais.
    if (dataChannel === null && hasStartedRef.current) {
      myHalfRef.current = null;
      myCaptureHostTimeRef.current = null;
      peerHalfRef.current = null;
      peerCaptureHostTimeRef.current = null;
      pendingPoseRef.current = currentPoseRef.current;
      setAwaitingPeer(true);
    }
  }, [dataChannel]);

  function scheduleCapture(pose: number, fireAtHost: number) {
    setHasStarted(true);
    setStatus("countdown");
    const delay = computeCaptureDelay(fireAtHost, offsetRef.current);
    setCountdownMs(delay);

    const start = Date.now();
    function tick() {
      const remain = delay - (Date.now() - start);
      setCountdownMs(Math.max(0, remain));
      if (remain > 0) requestAnimationFrame(tick);
    }
    tick();

    setTimeout(() => doCapture(pose, fireAtHost), delay);
  }

  async function doCapture(pose: number, fireAtHost: number) {
    setStatus("capturing");
    const video = localVideoRef.current;
    if (!video) return;

    await waitForVideoReady(video);

    let dataUrl: string;
    try {
      dataUrl = captureFrame(video, { mirrored: isInitiator });
    } catch (error) {
      console.error(`[capture] pose ${pose} échec de capture:`, error);
      return;
    }
    playShutter();

    const hostTime = Date.now() + offsetRef.current;
    myHalfRef.current = dataUrl;
    myCaptureHostTimeRef.current = hostTime;

    console.debug(
      `[capture] pose ${pose} captured at hostTime=${Math.round(hostTime)} target=${fireAtHost} drift=${Math.round(hostTime - fireAtHost)}ms`,
    );

    if (channelRef.current) sendImage(channelRef.current, pose, dataUrl, hostTime);
    tryComposeCell(pose);
  }

  function resolveNames() {
    const peerName = peerNameRef.current;
    return {
      host: isInitiator ? myName : (peerName ?? tParticipant("defaultHost")),
      guest: isInitiator ? (peerName ?? tParticipant("defaultGuest")) : myName,
    };
  }

  function tryComposeCell(pose: number) {
    if (!myHalfRef.current || !peerHalfRef.current) return;

    if (myCaptureHostTimeRef.current != null && peerCaptureHostTimeRef.current != null) {
      const delta = Math.abs(myCaptureHostTimeRef.current - peerCaptureHostTimeRef.current);
      console.debug(`[capture] pose ${pose} écart de synchro: ${Math.round(delta)}ms`);
      setCaptureDeltasMs((prev) => [...prev, delta]);
    }

    cellsRef.current[pose] = {
      left: isInitiator ? myHalfRef.current : peerHalfRef.current,
      right: isInitiator ? peerHalfRef.current : myHalfRef.current,
    };
    // Reflété en state à chaque pose (pas seulement à la toute fin) — permet
    // d'afficher un aperçu live des poses déjà prises pendant la séance.
    setCells([...cellsRef.current]);

    myHalfRef.current = null;
    myCaptureHostTimeRef.current = null;
    peerHalfRef.current = null;
    peerCaptureHostTimeRef.current = null;

    const nextPose = pose + 1;
    setCurrentPose(nextPose);

    if (nextPose >= effectivePosesRef.current) {
      setStatus("composing");
      const finalCells = [...cellsRef.current];
      const { host, guest } = resolveNames();
      const footerDate = formatFooterDate(new Date(), locale);
      const footerText = tStrip("footerWithNames", { date: footerDate, host, guest });
      composeStrip(finalCells, {
        frame: FRAMES[effectiveFrameIdRef.current],
        filter: "classic",
        style: effectiveStyleRef.current,
        footerText,
      })
        .then((url) => {
          setStripUrl(url);
          setStatus("done");
        })
        .catch((error) => console.error("[capture] échec de composition de la bande:", error));
      return;
    }

    setStatus("idle");
    if (isInitiator) setTimeout(() => triggerCapture(nextPose), config.capture.autoAdvanceDelayMs);
  }

  function triggerCapture(pose: number) {
    if (!isInitiator) return;
    if (!channelRef.current) {
      // Partenaire pas (encore) prêt — on suspend : reprise auto dès que le
      // data channel (re)devient disponible (voir channel.onOpen ci-dessus).
      pendingPoseRef.current = pose;
      setAwaitingPeer(true);
      return;
    }
    pendingPoseRef.current = null;
    setAwaitingPeer(false);
    const fireAtHost = Date.now() + config.capture.leadMs;
    channelRef.current.send({ t: "capture", pose, fireAtHost });
    scheduleCapture(pose, fireAtHost);
  }

  const { host: hostName, guest: guestName } = resolveNames();

  return {
    status,
    hasStarted,
    currentPose,
    poses: effectivePoses,
    frameId: effectiveFrameId,
    style: effectiveStyle,
    countdownMs,
    stripUrl,
    cells,
    captureDeltasMs,
    awaitingPeer,
    hostName,
    guestName,
    startSession: () => triggerCapture(0),
  };
}
