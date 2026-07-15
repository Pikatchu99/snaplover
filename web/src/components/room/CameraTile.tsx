"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Loader2, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type CameraTileState = "ready" | "connecting" | "off";

interface CameraTileProps {
  stream: MediaStream | null;
  label: string;
  state: CameraTileState;
  mirrored?: boolean;
  muted?: boolean;
}

const STATE_CONFIG = {
  ready: { icon: CheckCircle2, className: "text-emerald-400", text: "Prête" },
  connecting: { icon: Loader2, className: "text-amber-400 animate-spin", text: "En cours" },
  off: { icon: VideoOff, className: "text-red-400", text: "Off" },
} as const;

export function CameraTile({ stream, label, state, mirrored, muted }: CameraTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const { icon: Icon, className, text } = STATE_CONFIG[state];

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={cn("h-full w-full object-cover", mirrored && "-scale-x-100")}
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className={cn("flex items-center gap-1 text-xs font-medium", className)}>
          <Icon className="size-4" />
          {text}
        </span>
      </div>
    </div>
  );
}
