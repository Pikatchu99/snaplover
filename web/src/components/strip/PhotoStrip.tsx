"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Heart, Plus, Share2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { composeStrip, type StripCell } from "@/lib/capture/compose-strip";
import { composeStoryImage } from "@/lib/capture/compose-story";
import { formatFooterDate } from "@/lib/capture/format-footer-date";
import { FILTER_IDS } from "@/lib/capture/filters";
import { FRAMES } from "@/lib/frames/frame-registry";
import { config } from "@/lib/config";
import { SITE_URL } from "@/lib/site";
import {
  trackChallengeDownloaded,
  trackChallengeShared,
  trackLike,
  trackStripDownloaded,
  trackStripShared,
} from "@/lib/analytics";
import { Link } from "@/i18n/navigation";
import type { FilterId, FrameId, StripStyle } from "@/types/frame";
import type { ChallengeMode } from "@/types/sticker";

interface PhotoStripProps {
  cells: StripCell[];
  initialStripUrl: string;
  frameId: FrameId;
  style: StripStyle;
  /** Duo uniquement (RoomClient) — prénoms des deux participants. */
  names?: { host: string; guest: string };
  /** Solo uniquement (SoloClient) — signature du footer. */
  soloName?: string;
  mode: ChallengeMode;
}

// Résultat (E6) : bande composée, filtres, téléchargement, partage.
// Fond clair (comme landing/create) — seuls lobby/séance sont en sombre.
// Cadres/thèmes (§13) : voir lib/frames/frame-registry.ts — packs illustrés
// pas encore disponibles (assets manquants).
export function PhotoStrip({ cells, initialStripUrl, frameId, style, names, soloName, mode }: PhotoStripProps) {
  const t = useTranslations("photoStrip");
  const tStrip = useTranslations("strip");
  const locale = useLocale();
  const [filter, setFilter] = useState<FilterId>("classic");
  const [stripUrl, setStripUrl] = useState(initialStripUrl);
  const [liked, setLiked] = useState(false);
  const [composingStory, setComposingStory] = useState(false);
  const isChallenge = mode === "challenge";
  // Absent aussi bien en challenge solo qu'en solo classique (docs/STICKER-CHALLENGES.md
  // + extension solo classique) — une seule personne, aucun prénom de partenaire à afficher.
  const isSolo = !names;

  function handleLike() {
    if (liked) return;
    trackLike("app");
    setLiked(true);
  }

  useEffect(() => {
    let cancelled = false;
    const footerDate = formatFooterDate(new Date(), locale);
    const footerText = isSolo
      ? isChallenge
        ? tStrip("footerChallengeSolo", { date: footerDate, name: soloName ?? "" })
        : tStrip("footerSolo", { date: footerDate, name: soloName ?? "" })
      : isChallenge
        ? tStrip("footerChallenge", { date: footerDate, host: names?.host ?? "", guest: names?.guest ?? "" })
        : tStrip("footerWithNames", { date: footerDate, host: names?.host ?? "", guest: names?.guest ?? "" });
    composeStrip(cells, {
      frame: FRAMES[frameId],
      filter,
      style,
      footerText,
      participants: isSolo ? "solo" : "duo",
      challenge: isChallenge ? { widthRatio: config.challenge.stickerWidthRatio } : undefined,
    }).then((url) => {
      if (!cancelled) setStripUrl(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // SITE_URL est une valeur d'infra (lib/site.ts, jamais en dur) — absente en
  // dev/preview sans NEXT_PUBLIC_SITE_URL configuré, auquel cas on omet
  // silencieusement le lien plutôt que de glisser un texte tronqué/vide.
  const shareText = SITE_URL ? `${t("shareText")}\n${SITE_URL}` : t("shareText");

  // Partage-ou-télécharge un PNG déjà généré : Web Share API si dispo (mobile,
  // la cible la plus probable pour ce genre de contenu), sinon téléchargement
  // — même fallback pour le format classique et le format Story.
  async function shareOrDownload(url: string, filename: string, text: string) {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], filename, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "SnapLover", text });
        return;
      } catch {
        // annulé ou indisponible : on retombe sur le téléchargement
      }
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  async function handleShare() {
    if (isChallenge) trackChallengeShared();
    trackStripShared({ participants: isSolo ? "solo" : "duo", mode });
    await shareOrDownload(stripUrl, "snaplover.png", shareText);
  }

  async function handleShareStory() {
    if (isChallenge) trackChallengeShared();
    trackStripShared({ participants: isSolo ? "solo" : "duo", mode, format: "story" });
    setComposingStory(true);
    try {
      const storyUrl = await composeStoryImage(stripUrl, { tagline: t("storyTagline") });
      await shareOrDownload(storyUrl, "snaplover-story.png", shareText);
    } finally {
      setComposingStory(false);
    }
  }

  function handleDownloadClick() {
    if (isChallenge) trackChallengeDownloaded();
    trackStripDownloaded({ participants: isSolo ? "solo" : "duo", mode });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#fbf7f1] px-4 pt-12 pb-20">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-semibold tracking-[0.15em] text-[#fb5a46] uppercase">{t("eyebrow")}</p>
        <h1 className="font-heading text-2xl font-bold text-[#1c1712]">{t("title")}</h1>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client, next/image ne s'applique pas */}
      <img src={stripUrl} alt={t("imageAlt")} className="max-h-[50vh] rounded-lg border border-[#ece4d8] shadow-sm" />

      {/* Avant le téléchargement : pour que les gens voient/essaient les
          filtres avant de partir avec la version "classic" par défaut. */}
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
            {t(`filters.${id}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={stripUrl}
          download="snaplover.png"
          onClick={handleDownloadClick}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Download className="size-4" />
          {t("download")}
        </a>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#ece4d8] px-5 py-2.5 text-sm font-medium text-[#1c1712] transition hover:bg-[#ece4d8]/40"
        >
          <Share2 className="size-4" />
          {t("share")}
        </button>
        {/* Format 9:16 dédié aux Stories (Instagram/TikTok/Snapchat) — la
            bande brute n'est jamais au bon ratio pour ce canal de partage,
            voir lib/capture/compose-story.ts. */}
        <button
          onClick={handleShareStory}
          disabled={composingStory}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#ece4d8] px-5 py-2.5 text-sm font-medium text-[#1c1712] transition hover:bg-[#ece4d8]/40 disabled:opacity-60"
        >
          <Smartphone className="size-4" />
          {composingStory ? t("preparingStory") : t("shareStory")}
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
        {t("likePrompt")}
      </button>

      <Link
        href="/create"
        className="inline-flex items-center gap-2 rounded-full bg-[#1c1712] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        <Plus className="size-4" />
        {t("newSession")}
      </Link>

      {/* Après une séance solo (classique ou challenge) : suggérer le format
          duo équivalent, décision explicite du spec (docs/STICKER-CHALLENGES.md)
          — pas pertinent une fois déjà en duo. */}
      {isSolo && (
        <Link
          href={`/create?mode=${mode}&type=duo`}
          className="text-sm text-[#8c8378] underline-offset-2 hover:text-[#1c1712] hover:underline"
        >
          {t("doItTogether")}
        </Link>
      )}

      <p className="max-w-md text-center text-xs text-[#8c8378]">{t("note")}</p>
    </div>
  );
}
