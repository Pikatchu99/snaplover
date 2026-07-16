import type { RefObject } from "react";
import { CameraTile } from "@/components/room/CameraTile";
import { Countdown } from "@/components/room/Countdown";
import type { CaptureSessionStatus } from "@/hooks/use-capture-session";

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#161319] px-4 py-12">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">● live</span>
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white">
          Pose {poseNumber} / {poses}
        </span>
      </div>

      <p className="text-sm text-white/60">Regardez l&apos;objectif…</p>

      <div className="relative grid w-full max-w-2xl grid-cols-2 gap-4">
        <CameraTile stream={localStream} label="Vous" state="ready" mirrored muted videoRef={localVideoRef} />
        <CameraTile stream={remoteStream} label="Partenaire" state={remoteStream ? "ready" : "off"} />
        {status === "countdown" && <Countdown remainingMs={countdownMs} />}
      </div>
    </div>
  );
}
