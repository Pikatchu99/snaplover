import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// `/r/*` = rooms éphémères/privées, jamais à indexer (voir aussi le
// `robots: { index: false }` posé directement sur app/r/[code]/page.tsx).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/r/" }],
    sitemap: SITE_URL ? `${SITE_URL}/sitemap.xml` : undefined,
  };
}
