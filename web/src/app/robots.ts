import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// `/r/*`, `/duel/r/*` et `/word-sonar/r/*` = rooms éphémères/privées, jamais
// à indexer (voir aussi le `robots: { index: false }` posé directement sur
// chaque page.tsx de room). Les deux formes (avec et sans préfixe /en) sont
// exclues pour chacune — localePrefix "as-needed" laisse fr sans préfixe,
// voir i18n/routing.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/r/", "/en/r/", "/duel/r/", "/en/duel/r/", "/word-sonar/r/", "/en/word-sonar/r/"],
      },
    ],
    sitemap: SITE_URL ? `${SITE_URL}/sitemap.xml` : undefined,
  };
}
