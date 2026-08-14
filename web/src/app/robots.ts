import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// `/r/*` et `/duel/r/*` = rooms éphémères/privées, jamais à indexer (voir
// aussi le `robots: { index: false }` posé directement sur
// app/[locale]/r/[code]/page.tsx et app/[locale]/duel/r/[code]/page.tsx).
// Les deux formes (avec et sans préfixe /en) sont exclues — localePrefix
// "as-needed" laisse fr sans préfixe, voir i18n/routing.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/r/", "/en/r/", "/duel/r/", "/en/duel/r/"] }],
    sitemap: SITE_URL ? `${SITE_URL}/sitemap.xml` : undefined,
  };
}
