"use client";

import { useRef } from "react";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useCaptureSession } from "@/hooks/use-capture-session";
import { Lobby } from "@/components/room/Lobby";
import { CaptureStage } from "@/components/room/CaptureStage";
import { PhotoStrip } from "@/components/strip/PhotoStrip";

const POSES = 3;

export function RoomClient({ code }: { code: string }) {
  const { localStream, remoteStream, status, dataChannel, isInitiator } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const {
    status: captureStatus,
    hasStarted,
    currentPose,
    countdownMs,
    stripUrl,
    cells,
    startSession,
    retry,
  } = useCaptureSession({ dataChannel, isInitiator, poses: POSES, localVideoRef });

  if (stripUrl) {
    return <PhotoStrip cells={cells} initialStripUrl={stripUrl} onRetry={retry} />;
  }

  if (hasStarted) {
    return (
      <CaptureStage
        localStream={localStream}
        remoteStream={remoteStream}
        localVideoRef={localVideoRef}
        status={captureStatus}
        currentPose={currentPose}
        poses={POSES}
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
