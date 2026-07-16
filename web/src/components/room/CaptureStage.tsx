import type { RefObject } from "react";
import { CameraTile } from "@/components/room/CameraTile";
import { Countdown } from "@/components/room/Countdown";
import type { CaptureSessionStatus } from "@/hooks/use-capture-session";
import { fr } from "@/i18n/messages";

interface CaptureStageProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  status: CaptureSessionStatus;
  currentPose: number;
  poses: number;
  countdownMs: number;
}

// Écran de séance (compte à rebours 3·2·1 synchrone) — SNAPROOM-SPEC.md §12 (E5).
export function CaptureStage({
  localStream,
  remoteStream,
  localVideoRef,
  status,
  currentPose,
  poses,
  countdownMs,
}: CaptureStageProps) {
  const poseNumber = Math.min(currentPose + 1, poses);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 py-6">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
          {fr.captureStage.pose(poseNumber, poses)}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#fb5a46]">
          <span className="size-1.5 rounded-full bg-[#fb5a46]" />
          {fr.captureStage.instruction}
        </span>
      </div>

      <div className="relative mx-auto grid w-full max-w-2xl flex-1 grid-cols-2 gap-4">
        <CameraTile stream={localStream} label={fr.lobby.you} state="ready" mirrored muted videoRef={localVideoRef} />
        <CameraTile stream={remoteStream} label={fr.lobby.partner} state={remoteStream ? "ready" : "off"} />
        {status === "countdown" && <Countdown remainingMs={countdownMs} />}
      </div>
    </div>
  );
}
