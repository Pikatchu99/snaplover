import { ArrowRight, MessageSquareText, Pencil, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const STEP_ICONS = [MessageSquareText, Pencil, Sparkles];

// Section "Doodle Duel" — même gabarit que PackOfTheDay.tsx (eyebrow +
// headline + subtitle + visuel + CTA), pour une prominence égale sur la
// landing : mis en avant en une seule ligne de texte au départ, corrigé
// suite à un retour utilisateur explicite après l'avoir testé.
export async function DoodleDuelPromo() {
  const t = await getTranslations("landing.doodleDuel");
  const steps = t.raw("steps") as string[];

  return (
    <section className="bg-white px-6 py-16 md:px-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <span className="text-xs font-semibold tracking-widest text-[#fb5a46] uppercase">{t("eyebrow")}</span>
        <h2 className="font-heading text-2xl font-extrabold text-[#1c1712] sm:text-3xl">{t("headline")}</h2>
        <p className="max-w-xl text-base text-[#8c8378] sm:text-lg">{t("subtitle")}</p>

        <div className="flex gap-6 sm:gap-10">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <div key={step} className="flex flex-col items-center gap-2">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#fb5a46] to-[#ff7d54] text-white sm:size-16">
                  <Icon className="size-6" />
                </div>
                <p className="max-w-20 text-xs text-[#8c8378]">{step}</p>
              </div>
            );
          })}
        </div>

        <Link
          href="/duel"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {t("cta")}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
