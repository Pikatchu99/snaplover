"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useTranslations } from "next-intl";
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

// Rond 18px, dot de statut en haut à droite, pill de nom en bas à gauche —
// voir docs/design/design-system.dc.html ("Camera tile & status").
const STATE_DOT_CLASS = {
  ready: "bg-emerald-400",
  connecting: "bg-amber-400",
  off: "bg-[#fb5a46]",
} as const;

export function CameraTile({ stream, label, state, mirrored, muted, videoRef: externalRef }: CameraTileProps) {
  const t = useTranslations("cameraTile");
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

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[18px] bg-zinc-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={cn("h-full w-full object-cover", mirrored && "-scale-x-100")}
      />
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/60">
          {state === "connecting" ? t("connecting") : t("off")}
        </div>
      )}
      <span
        className={cn(
          "absolute right-3 top-3 size-3 rounded-full ring-2 ring-black/30",
          STATE_DOT_CLASS[state],
        )}
      />
      <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
        {label}
      </span>
    </div>
  );
}
