"use client";

import { useRef } from "react";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useCaptureSession } from "@/hooks/use-capture-session";
import { Lobby } from "@/components/room/Lobby";
import { CaptureStage } from "@/components/room/CaptureStage";
import { PhotoStrip } from "@/components/strip/PhotoStrip";
import type { FrameId, StripStyle } from "@/types/frame";

interface RoomClientProps {
  code: string;
  // Config initiale lue dans l'URL — l'hôte fait autorité et la rediffuse au
  // data channel (voir hooks/use-capture-session.ts), l'invité peut l'ajuster
  // s'il est arrivé via un code saisi sans ces query params.
  poses: number;
  frameId: FrameId;
  style: StripStyle;
}

export function RoomClient({ code, poses, frameId, style }: RoomClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const {
    status: captureStatus,
    hasStarted,
    currentPose,
    poses: effectivePoses,
    frameId: effectiveFrameId,
    style: effectiveStyle,
    countdownMs,
    stripUrl,
    cells,
    startSession,
    retry,
  } = useCaptureSession({ dataChannel, isInitiator, poses, frameId, style, localVideoRef });

  if (stripUrl) {
    return (
      <PhotoStrip
        cells={cells}
        initialStripUrl={stripUrl}
        frameId={effectiveFrameId}
        style={effectiveStyle}
        onRetry={retry}
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
      />
    );
  }

  return (
    <Lobby
      roomCode={code}
      localStream={localStream}
      remoteStream={remoteStream}
      status={status}
      localVideoRef={localVideoRef}
      isInitiator={isInitiator}
      onLaunch={startSession}
    />
  );
}
