"use client";

import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import { redrawStrokes } from "@/lib/capture/doodle";
import { cn } from "@/lib/utils";
import type { DoodleStroke } from "@/types/doodle";

interface DuelCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  strokes: DoodleStroke[];
  interactive?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLCanvasElement>) => void;
}

// Surface de dessin "papier blanc" du duel — voir hooks/use-duel-session.ts.
// Contrairement au calque de components/strip/DoodleCanvas.tsx (transparent,
// superposé à une photo), ce canvas EST le fond (bg-white), pas un calque :
// pas d'image en dessous à préserver.
export function DuelCanvas({ canvasRef, strokes, interactive, onPointerDown, onPointerMove, onPointerUp }: DuelCanvasProps) {
  const strokesRef = useRef(strokes);

  useEffect(() => {
    strokesRef.current = strokes;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    redrawStrokes(ctx, strokes, canvas.width, canvas.height);
  }, [strokes, canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) redrawStrokes(ctx, strokesRef.current, width, height);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      data-duel-canvas="true"
      className={cn(
        "aspect-4/3 w-full touch-none rounded-2xl bg-white shadow-sm",
        interactive ? "cursor-crosshair" : "",
      )}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerLeave={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
    />
  );
}
