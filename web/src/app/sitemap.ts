import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Pages publiques statiques uniquement — `/r/[code]` est éphémère/privé et
// n'a jamais sa place ici (voir robots.ts + robots noindex sur la page).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL ?? "";
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/create`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/join`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
