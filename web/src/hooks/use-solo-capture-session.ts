"use client";

import { useRef, useState, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { captureFrame } from "@/lib/capture/capture-frame";
import { waitForVideoReady } from "@/lib/capture/wait-for-video-ready";
import { composeStrip, type StripCell } from "@/lib/capture/compose-strip";
import { formatFooterDate } from "@/lib/capture/format-footer-date";
import { playShutter } from "@/lib/audio/sound-effects";
import { FRAMES } from "@/lib/frames/frame-registry";
import { STICKERS } from "@/lib/stickers/sticker-registry";
import { pickStickers } from "@/lib/stickers/pick-stickers";
import { config } from "@/lib/config";
import {
  trackChallengeCompleted,
  trackChallengeSoloStarted,
  trackChallengeStarted,
  trackSessionCompleted,
  trackSessionStarted,
} from "@/lib/analytics";
import type { CaptureSessionStatus } from "@/hooks/use-capture-session";
import type { FrameId, StripStyle } from "@/types/frame";
import type { ChallengeMode, StickerDefinition, StickerId, StickerPackId } from "@/types/sticker";

interface UseSoloCaptureSessionOptions {
  poses: number;
  frameId: FrameId;
  style: StripStyle;
  mode: ChallengeMode;
  /** Présent uniquement quand mode === "challenge". */
  stickerPackId?: StickerPackId;
  /** Signature du footer de la bande — requis même en solo. */
  myName: string;
  localVideoRef: RefObject<HTMLVideoElement | null>;
}

// Orchestration d'une séance solo (classique ou challenge) : pas de pair, pas
// de data channel — chaque pose s'enchaîne localement jusqu'à composer la
// bande (une seule photo par pose, + sticker en challenge). Voir
// docs/STICKER-CHALLENGES.md. Volontairement une implémentation séparée de
// use-capture-session.ts (pas une extension) : rien à synchroniser/reconnecter,
// la logique réellement utile est plus simple.
export function useSoloCaptureSession({
  poses,
  frameId,
  style,
  mode,
  stickerPackId,
  myName,
  localVideoRef,
}: UseSoloCaptureSessionOptions) {
  const tStrip = useTranslations("strip");
  const locale = useLocale();
  const isChallenge = mode === "challenge";
  const [status, setStatus] = useState<CaptureSessionStatus>("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [currentPose, setCurrentPose] = useState(0);
  const [countdownMs, setCountdownMs] = useState(0);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [cells, setCells] = useState<StripCell[]>([]);
  // Tiré une seule fois au montage — pas besoin d'attendre un pair pour
  // connaître la séquence de stickers, contrairement au duo. Vide en classique.
  const [stickerIds] = useState<StickerId[]>(() => (isChallenge && stickerPackId ? pickStickers(stickerPackId, poses) : []));
  const cellsRef = useRef<StripCell[]>([]);

  function scheduleCapture(pose: number) {
    setStatus("countdown");
    const delay = config.capture.leadMs;
    setCountdownMs(delay);

    const start = Date.now();
    function tick() {
      const remain = delay - (Date.now() - start);
      setCountdownMs(Math.max(0, remain));
      if (remain > 0) requestAnimationFrame(tick);
    }
    tick();

    setTimeout(() => doCapture(pose), delay);
  }

  async function doCapture(pose: number) {
    setStatus("capturing");
    const video = localVideoRef.current;
    if (!video) return;

    await waitForVideoReady(video);

    let dataUrl: string;
    try {
      dataUrl = captureFrame(video, { mirrored: true });
    } catch (error) {
      console.error(`[capture] pose ${pose} échec de capture:`, error);
      return;
    }
    playShutter();

    cellsRef.current[pose] = { left: dataUrl, sticker: isChallenge ? STICKERS[stickerIds[pose]] : undefined };
    setCells([...cellsRef.current]);

    const nextPose = pose + 1;
    setCurrentPose(nextPose);

    if (nextPose >= poses) {
      setStatus("composing");
      const finalCells = [...cellsRef.current];
      const footerDate = formatFooterDate(new Date(), locale);
      const footerText = isChallenge
        ? tStrip("footerChallengeSolo", { date: footerDate, name: myName })
        : tStrip("footerSolo", { date: footerDate, name: myName });
      composeStrip(finalCells, {
        frame: FRAMES[frameId],
        filter: "classic",
        style,
        footerText,
        participants: "solo",
        challenge: isChallenge ? { widthRatio: config.challenge.stickerWidthRatio } : undefined,
      })
        .then((url) => {
          setStripUrl(url);
          setStatus("done");
          if (isChallenge) trackChallengeCompleted();
          trackSessionCompleted({ participants: "solo", mode });
        })
        .catch((error) => console.error("[capture] échec de composition de la bande:", error));
      return;
    }

    setStatus("idle");
    setTimeout(() => triggerCapture(nextPose), config.capture.autoAdvanceDelayMs);
  }

  function triggerCapture(pose: number) {
    if (pose === 0 && isChallenge) {
      trackChallengeSoloStarted();
      trackChallengeStarted();
    }
    if (pose === 0) trackSessionStarted({ participants: "solo", mode });
    setHasStarted(true);

    if (isChallenge) {
      // Phase de lecture/préparation — même mécanisme qu'en duo (voir
      // use-capture-session.ts), utile aussi en solo pour attraper un accessoire.
      setStatus("reveal");
      setTimeout(() => scheduleCapture(pose), config.challenge.revealMs);
      return;
    }

    // Classique : rien à préparer/regarder avant la pose, décompte direct
    // (même comportement que le duo classique).
    scheduleCapture(pose);
  }

  const currentStickerId = stickerIds[currentPose];
  const currentSticker: StickerDefinition | undefined = currentStickerId ? STICKERS[currentStickerId] : undefined;
  const stickerPreview = stickerIds.map((id) => STICKERS[id]);

  return {
    status,
    hasStarted,
    currentPose,
    poses,
    countdownMs,
    stripUrl,
    cells,
    currentSticker,
    stickerPreview,
    startSession: () => triggerCapture(0),
  };
}
