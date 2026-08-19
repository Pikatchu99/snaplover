"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Plus, RotateCcw, Share2 } from "lucide-react";
import { findQuestion } from "@/lib/duo-quiz/pick-questions";
import { composeDuoQuizRecap, type DuoQuizRecapRow } from "@/lib/duo-quiz/compose-recap";
import { shareOrDownload } from "@/lib/share-or-download";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { DuoQuizRoundResult } from "@/types/duo-quiz";

interface DuoQuizRecapProps {
  rounds: DuoQuizRoundResult[];
  scores: { host: number; guest: number };
  isInitiator: boolean;
  onReplay: () => void;
}

// Carte récap — voir lib/duo-quiz/compose-recap.ts. "Rejouer" repart sur la
// MÊME connexion (l'hôte doit relancer explicitement, voir CLAUDE.md "Duo
// Quiz" : aucun message réseau, chaque côté revient à sa salle d'attente
// indépendamment) ; "Nouvelle partie" crée un lien tout neuf.
export function DuoQuizRecap({ rounds, scores, isInitiator, onReplay }: DuoQuizRecapProps) {
  const t = useTranslations("duoQuizRecap");
  const locale = useLocale() as Locale;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const myScore = isInitiator ? scores.host : scores.guest;
  const partnerScore = isInitiator ? scores.guest : scores.host;

  useEffect(() => {
    let cancelled = false;
    const rows: DuoQuizRecapRow[] = rounds.map((round) => ({
      label: findQuestion(round.questionId)?.prompt[locale] ?? "",
      hostCorrect: round.hostCorrect,
      guestCorrect: round.guestCorrect,
    }));
    composeDuoQuizRecap(rows, {
      scoreText: t("scoreText", { mine: myScore, partner: partnerScore }),
      footerText: t("footerText"),
      youLabel: t("youLabel"),
      partnerLabel: t("partnerLabel"),
      isInitiator,
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
    a.download = "snaplover-duo-quiz.png";
    a.click();
  }

  async function handleShare() {
    if (!imageUrl) return;
    await shareOrDownload(imageUrl, "snaplover-duo-quiz.png", t("shareText"));
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
          href="/duo-quiz"
          className="inline-flex items-center gap-2 rounded-full bg-[#1c1712] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="size-4" />
          {t("newGame")}
        </Link>
      </div>
    </div>
  );
}
