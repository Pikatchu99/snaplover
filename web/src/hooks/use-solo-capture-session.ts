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
import { trackChallengeCompleted, trackChallengeSoloStarted, trackChallengeStarted } from "@/lib/analytics";
import type { CaptureSessionStatus } from "@/hooks/use-capture-session";
import type { FrameId } from "@/types/frame";
import type { StickerDefinition, StickerId, StickerPackId } from "@/types/sticker";

interface UseSoloCaptureSessionOptions {
  poses: number;
  frameId: FrameId;
  stickerPackId: StickerPackId;
  localVideoRef: RefObject<HTMLVideoElement | null>;
}

// Orchestration du challenge solo : pas de pair, pas de data channel — chaque
// pose s'enchaîne localement (lecture du sticker → 3·2·1 → capture) jusqu'à
// composer la bande "moi | sticker". Voir docs/STICKER-CHALLENGES.md. Volontairement
// une implémentation séparée de use-capture-session.ts (pas une extension) :
// rien à synchroniser/reconnecter, la logique réellement utile est plus simple.
export function useSoloCaptureSession({ poses, frameId, stickerPackId, localVideoRef }: UseSoloCaptureSessionOptions) {
  const tStrip = useTranslations("strip");
  const locale = useLocale();
  const [status, setStatus] = useState<CaptureSessionStatus>("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [currentPose, setCurrentPose] = useState(0);
  const [countdownMs, setCountdownMs] = useState(0);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [cells, setCells] = useState<StripCell[]>([]);
  // Tiré une seule fois au montage — pas besoin d'attendre un pair pour
  // connaître la séquence de stickers, contrairement au duo.
  const [stickerIds] = useState<StickerId[]>(() => pickStickers(stickerPackId, poses));
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

    cellsRef.current[pose] = { left: dataUrl, sticker: STICKERS[stickerIds[pose]] };
    setCells([...cellsRef.current]);

    const nextPose = pose + 1;
    setCurrentPose(nextPose);

    if (nextPose >= poses) {
      setStatus("composing");
      const finalCells = [...cellsRef.current];
      const footerDate = formatFooterDate(new Date(), locale);
      const footerText = tStrip("footerChallengeSolo", { date: footerDate });
      composeStrip(finalCells, {
        frame: FRAMES[frameId],
        filter: "classic",
        style: "vertical",
        footerText,
        challenge: { widthRatio: config.challenge.stickerWidthRatio, participants: "solo" },
      })
        .then((url) => {
          setStripUrl(url);
          setStatus("done");
          trackChallengeCompleted();
        })
        .catch((error) => console.error("[capture] échec de composition de la bande:", error));
      return;
    }

    setStatus("idle");
    setTimeout(() => triggerCapture(nextPose), config.capture.autoAdvanceDelayMs);
  }

  function triggerCapture(pose: number) {
    if (pose === 0) {
      trackChallengeSoloStarted();
      trackChallengeStarted();
    }
    // Phase de lecture/préparation — même mécanisme qu'en duo (voir
    // use-capture-session.ts), utile aussi en solo pour attraper un accessoire.
    setHasStarted(true);
    setStatus("reveal");
    setTimeout(() => scheduleCapture(pose), config.challenge.revealMs);
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
