"use client";

import { useEffect, useState } from "react";
import { Download, RotateCcw, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { composeStrip, type StripCell } from "@/lib/capture/compose-strip";
import { FILTERS } from "@/lib/capture/filters";
import { FRAMES, DEFAULT_FRAME_ID } from "@/lib/frames/frame-registry";
import type { FilterId } from "@/types/frame";

interface PhotoStripProps {
  cells: StripCell[];
  initialStripUrl: string;
  onRetry: () => void;
}

const ACTION_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10";

// Résultat (E6) : bande composée, filtres, téléchargement, partage, reprendre.
// Cadres/thèmes (§13) : voir lib/frames/frame-registry.ts — packs illustrés
// pas encore disponibles (assets manquants), sélecteur de cadre à E3.
export function PhotoStrip({ cells, initialStripUrl, onRetry }: PhotoStripProps) {
  const [filter, setFilter] = useState<FilterId>("classic");
  const [stripUrl, setStripUrl] = useState(initialStripUrl);

  useEffect(() => {
    let cancelled = false;
    composeStrip(cells, { frame: FRAMES[DEFAULT_FRAME_ID], filter }).then((url) => {
      if (!cancelled) setStripUrl(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleShare() {
    const blob = await (await fetch(stripUrl)).blob();
    const file = new File([blob], "snaproom.png", { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "SnapRoom" });
        return;
      } catch {
        // annulé ou indisponible : on retombe sur le téléchargement
      }
    }

    const a = document.createElement("a");
    a.href = stripUrl;
    a.download = "snaproom.png";
    a.click();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#161319] px-4 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm text-white/60">C&apos;est dans la boîte</p>
        <h1 className="font-heading text-2xl font-bold text-white">Votre bande est prête</h1>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client, next/image ne s'applique pas */}
      <img src={stripUrl} alt="Bande photo composée" className="max-h-[55vh] rounded-lg border border-white/10" />

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              filter === f.id
                ? "border-white bg-white text-[#161319]"
                : "border-white/20 text-white hover:bg-white/10",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href={stripUrl} download="snaproom.png" className={ACTION_BUTTON_CLASS}>
          <Download className="size-4" />
          Télécharger PNG
        </a>
        <button onClick={handleShare} className={ACTION_BUTTON_CLASS}>
          <Share2 className="size-4" />
          Partager
        </button>
        <button onClick={onRetry} className={ACTION_BUTTON_CLASS}>
          <RotateCcw className="size-4" />
          Reprendre
        </button>
      </div>

      <p className="max-w-md text-center text-xs text-white/50">
        Vous avez chacun votre copie. La bande pleine résolution est enregistrée sur chaque
        appareil.
      </p>
    </div>
  );
}
