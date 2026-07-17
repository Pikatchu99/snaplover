"use client";

import { useEffect, useState } from "react";
import { Download, Heart, RotateCcw, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { composeStrip, type StripCell } from "@/lib/capture/compose-strip";
import { FILTER_IDS } from "@/lib/capture/filters";
import { FRAMES } from "@/lib/frames/frame-registry";
import { fr } from "@/i18n/messages";
import { trackLike } from "@/lib/analytics";
import type { FilterId, FrameId, StripStyle } from "@/types/frame";

interface PhotoStripProps {
  cells: StripCell[];
  initialStripUrl: string;
  frameId: FrameId;
  style: StripStyle;
  names: { host: string; guest: string };
  onRetry: () => void;
}

// Résultat (E6) : bande composée, filtres, téléchargement, partage, reprendre.
// Fond clair (comme landing/create) — seuls lobby/séance sont en sombre.
// Cadres/thèmes (§13) : voir lib/frames/frame-registry.ts — packs illustrés
// pas encore disponibles (assets manquants).
export function PhotoStrip({ cells, initialStripUrl, frameId, style, names, onRetry }: PhotoStripProps) {
  const [filter, setFilter] = useState<FilterId>("classic");
  const [stripUrl, setStripUrl] = useState(initialStripUrl);
  const [liked, setLiked] = useState(false);

  function handleLike() {
    if (liked) return;
    trackLike("app");
    setLiked(true);
  }

  useEffect(() => {
    let cancelled = false;
    composeStrip(cells, { frame: FRAMES[frameId], filter, style, names }).then((url) => {
      if (!cancelled) setStripUrl(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleShare() {
    const blob = await (await fetch(stripUrl)).blob();
    const file = new File([blob], "snaplover.png", { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "SnapLover" });
        return;
      } catch {
        // annulé ou indisponible : on retombe sur le téléchargement
      }
    }

    const a = document.createElement("a");
    a.href = stripUrl;
    a.download = "snaplover.png";
    a.click();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#fbf7f1] px-4 pt-12 pb-20">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-semibold tracking-[0.15em] text-[#fb5a46] uppercase">{fr.photoStrip.eyebrow}</p>
        <h1 className="font-heading text-2xl font-bold text-[#1c1712]">{fr.photoStrip.title}</h1>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client, next/image ne s'applique pas */}
      <img
        src={stripUrl}
        alt="Bande photo composée"
        className="max-h-[50vh] rounded-lg border border-[#ece4d8] shadow-sm"
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={stripUrl}
          download="snaplover.png"
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Download className="size-4" />
          {fr.photoStrip.download}
        </a>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#ece4d8] px-5 py-2.5 text-sm font-medium text-[#1c1712] transition hover:bg-[#ece4d8]/40"
        >
          <Share2 className="size-4" />
          {fr.photoStrip.share}
        </button>
      </div>

      {/* Juste après la bande composée : le meilleur moment pour demander,
          l'expérience vient d'être vécue en entier. */}
      <button
        onClick={handleLike}
        disabled={liked}
        className="flex items-center gap-2 rounded-full border border-[#ece4d8] px-4 py-1.5 text-sm font-medium text-[#8c8378] transition hover:border-[#8c8378] disabled:opacity-70"
      >
        <Heart className={`size-4 ${liked ? "fill-[#fb5a46] text-[#fb5a46]" : ""}`} />
        {fr.photoStrip.likePrompt}
      </button>

      <div className="flex gap-2">
        {FILTER_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              filter === id
                ? "border-[#1c1712] bg-[#1c1712] text-white"
                : "border-[#ece4d8] text-[#8c8378] hover:border-[#8c8378]",
            )}
          >
            {fr.photoStrip.filters[id]}
          </button>
        ))}
      </div>

      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full border border-[#ece4d8] px-4 py-1.5 text-sm font-medium text-[#8c8378] transition hover:border-[#8c8378]"
      >
        <RotateCcw className="size-4" />
        {fr.photoStrip.retry}
      </button>

      <p className="max-w-md text-center text-xs text-[#8c8378]">{fr.photoStrip.note}</p>
    </div>
  );
}
