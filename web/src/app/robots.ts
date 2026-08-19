import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GAMES } from "@/lib/games/registry";

// `/r/*` et une entrée par mini-jeu (voir lib/games/registry.ts, SEULE
// source de vérité) = rooms éphémères/privées, jamais à indexer (voir aussi
// le `robots: { index: false }` posé directement sur chaque page.tsx de
// room). Les deux formes (avec et sans préfixe /en) sont exclues pour
// chacune — localePrefix "as-needed" laisse fr sans préfixe, voir
// i18n/routing.ts. Ajouter un jeu au registre suffit à l'exclure ici, plus
// besoin d'une modification manuelle de ce fichier à chaque nouveau jeu.
export default function robots(): MetadataRoute.Robots {
  const gameDisallow = GAMES.flatMap((game) => [`${game.roomPath}/`, `/en${game.roomPath}/`]);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/r/", "/en/r/", ...gameDisallow],
      },
    ],
    sitemap: SITE_URL ? `${SITE_URL}/sitemap.xml` : undefined,
  };
}
