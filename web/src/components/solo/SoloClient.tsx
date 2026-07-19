"use client";

import { useEffect, useRef } from "react";
import { useUserMedia } from "@/hooks/use-user-media";
import { useSoloCaptureSession } from "@/hooks/use-solo-capture-session";
import { SoloPrep } from "@/components/solo/SoloPrep";
import { SoloCaptureStage } from "@/components/solo/SoloCaptureStage";
import { PhotoStrip } from "@/components/strip/PhotoStrip";
import type { FrameId } from "@/types/frame";
import type { StickerPackId } from "@/types/sticker";

interface SoloClientProps {
  poses: number;
  frameId: FrameId;
  stickerPackId: StickerPackId;
}

// Équivalent de RoomClient.tsx pour le challenge solo : pas de
// useRoomConnection (pas de room, pas de WebRTC) — juste la caméra locale et
// l'orchestration de séance. Voir docs/STICKER-CHALLENGES.md.
export function SoloClient({ poses, frameId, stickerPackId }: SoloClientProps) {
  const { stream: localStream, status: mediaStatus, retry: retryCamera } = useUserMedia();
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { status, hasStarted, currentPose, countdownMs, stripUrl, cells, currentSticker, startSession } = useSoloCaptureSession({
    poses,
    frameId,
    stickerPackId,
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
    return <PhotoStrip cells={cells} initialStripUrl={stripUrl} frameId={frameId} style="vertical" mode="challenge" />;
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
        cells={cells}
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
      stickerPackId={stickerPackId}
      onLaunch={startSession}
      onRetryCamera={retryCamera}
    />
  );
}
