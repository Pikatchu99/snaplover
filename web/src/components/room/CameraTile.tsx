"use client";

import { useEffect, useRef, type RefObject } from "react";
import { CheckCircle2, Loader2, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type CameraTileState = "ready" | "connecting" | "off";

interface CameraTileProps {
  stream: MediaStream | null;
  label: string;
  state: CameraTileState;
  mirrored?: boolean;
  muted?: boolean;
  /** Expose l'élément vidéo au parent (ex: capture de frame pendant la séance). */
  videoRef?: RefObject<HTMLVideoElement | null>;
}

const STATE_CONFIG = {
  ready: { icon: CheckCircle2, className: "text-emerald-400", text: "Prête" },
  connecting: { icon: Loader2, className: "text-amber-400 animate-spin", text: "En cours" },
  off: { icon: VideoOff, className: "text-red-400", text: "Off" },
} as const;

export function CameraTile({ stream, label, state, mirrored, muted, videoRef: externalRef }: CameraTileProps) {
  const localRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef ?? localRef;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    // `autoplay` seul ne suffit pas toujours après un (ré)attachement de
    // srcObject sur un élément fraîchement monté — appel explicite en filet.
    video.play().catch(() => {});
  }, [stream, videoRef]);

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
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-black/70 to-transparent p-3">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className={cn("flex items-center gap-1 text-xs font-medium", className)}>
          <Icon className="size-4" />
          {text}
        </span>
      </div>
    </div>
  );
}
