import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { STICKER_ASSETS } from "@/lib/stickers/sticker-assets.generated";
import { config } from "@/lib/config";
import type { StickerId, StickerPackId } from "@/types/sticker";

interface PackOfTheDayProps {
  packId: StickerPackId;
  stickerIds: StickerId[];
}

// Section "Pack du jour" — CTA immédiat vers le mode Challenge sur les 3
// stickers du jour (voir lib/stickers/daily-pack.ts). Server Component pur
// (pas d'interactivité hormis le Link), pleine largeur juste après le hero.
export async function PackOfTheDay({ packId, stickerIds }: PackOfTheDayProps) {
  const t = await getTranslations("landing.dailyPack");
  const tStickerPacks = await getTranslations("stickerPacks");

  const ctaParams = new URLSearchParams({
    mode: "challenge",
    pack: packId,
    poses: String(config.roomConfig.defaultPoses),
    stickers: stickerIds.join(","),
  });

  return (
    <section className="bg-white px-6 py-16 md:px-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <span className="text-xs font-semibold tracking-widest text-[#fb5a46] uppercase">{t("title")}</span>
        <h2 className="font-heading text-2xl font-extrabold text-[#1c1712] sm:text-3xl">{t("headline")}</h2>
        <p className="max-w-xl text-base text-[#8c8378] sm:text-lg">{t("subtitle")}</p>

        <div className="flex gap-3 sm:gap-4">
          {stickerIds.map((id) => {
            const asset = STICKER_ASSETS.find((sticker) => sticker.id === id);
            if (!asset) return null;
            return (
              <div
                key={id}
                className="size-24 overflow-hidden rounded-2xl border border-[#ece4d8] bg-[#fbf7f1] sm:size-32"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- décoratif, pas de source Next/Image configurée */}
                <img src={asset.path} alt="" className="size-full object-contain" />
              </div>
            );
          })}
        </div>

        <p className="text-xs text-[#8c8378]">{tStickerPacks(packId)}</p>

        <Link
          href={`/create?${ctaParams.toString()}`}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {t("cta")}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
