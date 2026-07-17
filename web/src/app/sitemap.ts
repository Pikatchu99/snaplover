import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { routing } from "@/i18n/routing";

// fr = pas de préfixe (localePrefix "as-needed", voir i18n/routing.ts).
function localizedPath(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

// Pages publiques statiques uniquement — `/r/[code]` est éphémère/privé et
// n'a jamais sa place ici (voir robots.ts + robots noindex sur la page).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL ?? "";
  const lastModified = new Date();
  const paths: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/create", priority: 0.8 },
    { path: "/join", priority: 0.8 },
  ];

  return paths.map(({ path, priority }) => ({
    url: `${base}${localizedPath(routing.defaultLocale, path)}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
    alternates: {
      languages: Object.fromEntries(routing.locales.map((locale) => [locale, `${base}${localizedPath(locale, path)}`])),
    },
  }));
}
