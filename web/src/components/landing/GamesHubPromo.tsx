import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GAMES } from "@/lib/games/registry";

// Section "Jeux" — une carte par jeu du registre (lib/games/registry.ts,
// SEULE source de vérité), pas une section plein-écran par jeu empilée
// (DoodleDuelPromo.tsx, le tout premier jeu, avait ce gabarit — plus tenable
// dès le second jeu). Ajouter un jeu au registre suffit à le faire
// apparaître ici, aucune modification de ce fichier nécessaire.
//
// Poids visuel augmenté par rapport à PackOfTheDay (headline plus grande,
// conteneur plus large) : à 10 jeux, cette section n'est plus un simple
// promo à un CTA, c'est le second pilier du produit après le photobooth
// (voir CLAUDE.md "Registre des jeux" — le photobooth garde son propre
// traitement hero, jamais une carte ici). `id="jeux"` sert d'ancre à un
// lien de renvoi placé dans le hero (voir page.tsx).
export async function GamesHubPromo() {
  const t = await getTranslations();

  return (
    <section id="jeux" className="bg-white px-6 py-16 md:px-16">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
        <span className="text-xs font-semibold tracking-widest text-[#fb5a46] uppercase">
          {t("landing.gamesHub.eyebrow")}
        </span>
        <h2 className="font-heading text-3xl font-extrabold text-[#1c1712] sm:text-4xl">
          {t("landing.gamesHub.headline")}
        </h2>
        <p className="max-w-xl text-base text-[#8c8378] sm:text-lg">{t("landing.gamesHub.subtitle")}</p>

        <div className="grid w-full gap-4 sm:grid-cols-2 md:grid-cols-3">
          {GAMES.map((game) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.kind}
                href={game.createPath}
                className="flex flex-col items-center gap-3 rounded-2xl border border-[#ece4d8] p-6 text-center transition hover:border-[#fb5a46]/40 hover:shadow-sm"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#fb5a46] to-[#ff7d54] text-white">
                  <Icon className="size-6" />
                </div>
                <p className="font-heading text-lg font-bold text-[#1c1712]">{game.name}</p>
                <span className="rounded-full bg-[#fbf7f1] px-2.5 py-1 text-xs font-medium text-[#8c8378]">
                  {t(`${game.promoNamespace}.tag`)}
                </span>
                <p className="text-sm text-[#8c8378]">{t(`${game.promoNamespace}.headline`)}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#fb5a46]">
                  {t(`${game.promoNamespace}.cta`)}
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
