"use client";

import { useEffect, useRef } from "react";
import { useUserMedia } from "@/hooks/use-user-media";
import { useSoloCaptureSession } from "@/hooks/use-solo-capture-session";
import { SoloPrep } from "@/components/solo/SoloPrep";
import { SoloCaptureStage } from "@/components/solo/SoloCaptureStage";
import { PhotoStrip } from "@/components/strip/PhotoStrip";
import type { FrameId, StripStyle } from "@/types/frame";
import type { ChallengeMode, StickerId, StickerPackId } from "@/types/sticker";

interface SoloClientProps {
  poses: number;
  frameId: FrameId;
  style: StripStyle;
  mode: ChallengeMode;
  /** Présent uniquement quand mode === "challenge". */
  stickerPackId?: StickerPackId;
  /** Stickers imposés (ex. CTA "Pack du jour" de la landing) — voir solo-config.ts. */
  stickerIds?: StickerId[];
  /** Prénom local à ce navigateur — signature du footer, requis même en solo. */
  name: string;
}

// Équivalent de RoomClient.tsx pour le solo (classique ou challenge) : pas de
// useRoomConnection (pas de room, pas de WebRTC) — juste la caméra locale et
// l'orchestration de séance. Voir docs/STICKER-CHALLENGES.md.
export function SoloClient({ poses, frameId, style, mode, stickerPackId, stickerIds, name }: SoloClientProps) {
  const { stream: localStream, status: mediaStatus, retry: retryCamera } = useUserMedia();
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { status, hasStarted, currentPose, countdownMs, revealMs, stripUrl, cells, currentSticker, startSession } = useSoloCaptureSession({
    poses,
    frameId,
    style,
    mode,
    stickerPackId,
    pinnedStickerIds: stickerIds,
    myName: name,
    localVideoRef,
  });

  useEffect(() => {
    // Vie privée : plus besoin de la caméra une fois la bande composée (voir
    // RoomClient.tsx, même raison).
    if (stripUrl && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [stripUrl, localStream]);

  if (stripUrl) {
    return <PhotoStrip cells={cells} initialStripUrl={stripUrl} frameId={frameId} style={style} mode={mode} soloName={name} />;
  }

  if (hasStarted) {
    return (
      <SoloCaptureStage
        localStream={localStream}
        localVideoRef={localVideoRef}
        status={status}
        currentPose={currentPose}
        poses={poses}
        countdownMs={countdownMs}
        revealMs={revealMs}
        cells={cells}
        mode={mode}
        currentSticker={currentSticker}
      />
    );
  }

  return (
    <SoloPrep
      localStream={localStream}
      status={mediaStatus}
      localVideoRef={localVideoRef}
      poses={poses}
      mode={mode}
      stickerPackId={stickerPackId}
      onLaunch={startSession}
      onRetryCamera={retryCamera}
    />
  );
}
