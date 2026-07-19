"use client";

import { useEffect, useRef } from "react";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useCaptureSession } from "@/hooks/use-capture-session";
import { Lobby } from "@/components/room/Lobby";
import { CaptureStage } from "@/components/room/CaptureStage";
import { PhotoStrip } from "@/components/strip/PhotoStrip";
import type { FrameId, StripStyle } from "@/types/frame";
import type { ChallengeMode, StickerPackId } from "@/types/sticker";

interface RoomClientProps {
  code: string;
  // Config initiale lue dans l'URL — l'hôte fait autorité et la rediffuse au
  // data channel (voir hooks/use-capture-session.ts), l'invité peut l'ajuster
  // s'il est arrivé via un code saisi sans ces query params.
  poses: number;
  frameId: FrameId;
  style: StripStyle;
  mode: ChallengeMode;
  stickerPackId?: StickerPackId;
  // Prénom local à CE navigateur, saisi sur /create ou /join — jamais dans le
  // lien partagé. Toujours renseigné : app/r/[code]/page.tsx redirige vers
  // /join si absent (lien collé directement) plutôt que de retomber sur un
  // prénom générique silencieux.
  name: string;
}

export function RoomClient({ code, poses, frameId, style, mode, stickerPackId, name }: RoomClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const {
    status: captureStatus,
    hasStarted,
    currentPose,
    poses: effectivePoses,
    frameId: effectiveFrameId,
    style: effectiveStyle,
    mode: effectiveMode,
    currentSticker,
    countdownMs,
    stripUrl,
    cells,
    awaitingPeer,
    hostName,
    guestName,
    startSession,
  } = useCaptureSession({
    dataChannel,
    isInitiator,
    poses,
    frameId,
    style,
    mode,
    stickerPackId,
    myName: name,
    localVideoRef,
  });

  useEffect(() => {
    // Vie privée : une fois la bande composée, plus besoin de la caméra —
    // on coupe le flux (stop, pas juste enabled=false) pour éteindre
    // vraiment le voyant caméra, pas seulement masquer l'aperçu. Pas de
    // retour en arrière possible depuis cet écran (voir PhotoStrip : "Nouvelle
    // séance" repart de /create) — pas besoin de redemander la caméra ici.
    if (stripUrl && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [stripUrl, localStream]);

  if (stripUrl) {
    return (
      <PhotoStrip
        cells={cells}
        initialStripUrl={stripUrl}
        frameId={effectiveFrameId}
        style={effectiveStyle}
        names={{ host: hostName, guest: guestName }}
        mode={effectiveMode}
      />
    );
  }

  if (hasStarted) {
    return (
      <CaptureStage
        localStream={localStream}
        remoteStream={remoteStream}
        localVideoRef={localVideoRef}
        status={captureStatus}
        currentPose={currentPose}
        poses={effectivePoses}
        countdownMs={countdownMs}
        awaitingPeer={awaitingPeer}
        cells={cells}
        mode={effectiveMode}
        currentSticker={currentSticker}
      />
    );
  }

  return (
    <Lobby
      roomCode={code}
      poses={effectivePoses}
      frameId={effectiveFrameId}
      style={effectiveStyle}
      localStream={localStream}
      remoteStream={remoteStream}
      status={status}
      localVideoRef={localVideoRef}
      isInitiator={isInitiator}
      onLaunch={startSession}
      onRetryCamera={retryCamera}
    />
  );
}
