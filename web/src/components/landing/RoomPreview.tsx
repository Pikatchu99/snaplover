"use client";

import { useEffect, useRef } from "react";
import { FRAMES } from "@/lib/frames/frame-registry";
import { cn } from "@/lib/utils";
import type { FrameId, StripStyle } from "@/types/frame";

interface RoomPreviewProps {
  poses: number;
  style: StripStyle;
  frameId: FrameId;
}

const PREVIEW_WIDTH = 220;
const PREVIEW_HEIGHT = 280;
const PREVIEW_MARGIN = 14;

// Aperçu live de la bande pendant le réglage (E3, "Set up your room") — le
// fond utilise le vrai `paint()` du cadre (mêmes motifs que l'export final),
// pas une approximation CSS.
export function RoomPreview({ poses, style, frameId }: RoomPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = FRAMES[frameId];
  const columns = style === "grid" ? 2 : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    frame.paint(ctx, canvas.width, canvas.height, PREVIEW_MARGIN);
  }, [frame]);

  return (
    <div className="relative mx-auto w-full max-w-55 overflow-hidden rounded-2xl border border-[#ece4d8] shadow-sm">
      <canvas
        ref={canvasRef}
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative p-3">
        <div className={cn("grid gap-1.5", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {Array.from({ length: poses }).map((_, i) => (
            <div key={i} className="flex aspect-4/3 gap-1 overflow-hidden rounded-md">
              <div className="flex-1 bg-[#ffb787]" />
              <div className="flex-1 bg-[#b9c2f7]" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[9px] tracking-widest" style={{ color: frame.footerTextColor }}>
          PREVIEW
        </p>
      </div>
    </div>
  );
}
