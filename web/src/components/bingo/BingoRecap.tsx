"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Plus, RotateCcw, Share2 } from "lucide-react";
import { composeBingoRecap, type BingoRecapRow } from "@/lib/bingo/compose-recap";
import { shareOrDownload } from "@/lib/share-or-download";
import { Link } from "@/i18n/navigation";
import type { BingoRoundResult } from "@/types/bingo";

interface BingoRecapProps {
  rounds: BingoRoundResult[];
  isInitiator: boolean;
  onReplay: () => void;
}

// Carte récap — voir lib/bingo/compose-recap.ts. "Rejouer" repart sur la
// MÊME connexion (même room) ; "Nouvelle partie" crée un lien tout neuf
// (même convention que les autres jeux).
export function BingoRecap({ rounds, isInitiator, onReplay }: BingoRecapProps) {
  const t = useTranslations("bingoRecap");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const mySide = isInitiator ? "host" : "guest";
  const myWins = rounds.filter((round) => round.winner === mySide).length;
  const partnerWins = rounds.filter((round) => round.winner !== mySide && round.winner !== "draw").length;

  useEffect(() => {
    let cancelled = false;
    const rows: BingoRecapRow[] = rounds.map((round, index) => {
      const outcome = round.winner === "draw" ? "draw" : round.winner === mySide ? "win" : "loss";
      return {
        label: t("roundLabel", { number: index + 1 }),
        outcome,
        outcomeText: outcome === "win" ? t("wonLabel") : outcome === "loss" ? t("lostLabel") : t("drawLabel"),
      };
    });
    composeBingoRecap(rows, {
      scoreText: t("scoreText", { mine: myWins, partner: partnerWins }),
      footerText: t("footerText"),
    }).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds]);

  async function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "snaplover-bingo.png";
    a.click();
  }

  async function handleShare() {
    if (!imageUrl) return;
    await shareOrDownload(imageUrl, "snaplover-bingo.png", t("shareText"));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#fbf7f1] px-4 pt-12 pb-20">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-semibold tracking-[0.15em] text-[#fb5a46] uppercase">{t("eyebrow")}</p>
        <h1 className="font-heading text-2xl font-bold text-[#1c1712]">{t("title")}</h1>
      </div>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client
        <img src={imageUrl} alt={t("imageAlt")} className="max-h-[60vh] rounded-lg border border-[#ece4d8] shadow-sm" />
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          disabled={!imageUrl}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Download className="size-4" />
          {t("download")}
        </button>
        <button
          onClick={handleShare}
          disabled={!imageUrl}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#ece4d8] px-5 py-2.5 text-sm font-medium text-[#1c1712] transition hover:bg-[#ece4d8]/40 disabled:opacity-50"
        >
          <Share2 className="size-4" />
          {t("share")}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onReplay}
          className="inline-flex items-center gap-2 rounded-full border border-[#ece4d8] px-4 py-2 text-sm font-medium text-[#1c1712] transition hover:bg-[#ece4d8]/40"
        >
          <RotateCcw className="size-4" />
          {t("replay")}
        </button>
        <Link
          href="/bingo"
          className="inline-flex items-center gap-2 rounded-full bg-[#1c1712] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="size-4" />
          {t("newGame")}
        </Link>
      </div>
    </div>
  );
}
