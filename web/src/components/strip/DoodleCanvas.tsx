"use client";

import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import { redrawStrokes } from "@/lib/capture/doodle";
import { cn } from "@/lib/utils";
import type { DoodleStroke } from "@/types/doodle";

interface DoodleCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  strokes: DoodleStroke[];
  interactive?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLCanvasElement>) => void;
}

// Canvas transparent superposé à la bande composée déjà finie (voir
// PhotoStrip.tsx) — un seul calque partagé, pas de miroir (ce n'est plus une
// vidéo de caméra) : les deux partenaires dessinent dessus, chacun voit les
// traits de l'autre en direct — voir hooks/use-doodle.ts.
export function DoodleCanvas({ canvasRef, strokes, interactive, onPointerDown, onPointerMove, onPointerUp }: DoodleCanvasProps) {
  const strokesRef = useRef(strokes);

  useEffect(() => {
    strokesRef.current = strokes;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // TEMPORAIRE — diagnostic CI doodle.spec.ts, à retirer.
    console.debug(`[doodle] repaint strokes=${strokes.length} canvas=${canvas.width}x${canvas.height}`);
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
      data-doodle-canvas="shared"
      className={cn(
        "absolute inset-0 h-full w-full touch-none rounded-lg",
        interactive ? "pointer-events-auto cursor-crosshair" : "pointer-events-none",
      )}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerLeave={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
    />
  );
}
