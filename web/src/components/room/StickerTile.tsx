"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { StickerDefinition } from "@/types/sticker";

interface StickerTileProps {
  sticker: StickerDefinition;
}

const CANVAS_SIZE = 320;

// Même gabarit que CameraTile (aspect-[3/4], coins 18px) pour garder la
// grille équilibrée en mode challenge — voir docs/STICKER-CHALLENGES.md.
export function StickerTile({ sticker }: StickerTileProps) {
  const t = useTranslations("captureStage");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    sticker.paint(ctx, CANVAS_SIZE).catch((error) => console.error("[sticker] échec de chargement:", error));
  }, [sticker]);

  return (
    <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-[18px] bg-white/10">
      <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="aspect-square w-2/3" />
      <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
        {t("stickerLabel")}
      </span>
    </div>
  );
}
