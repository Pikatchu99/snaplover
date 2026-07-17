// Mappe la locale next-intl (fr/en) vers un tag BCP 47 complet pour
// `toLocaleDateString` — pas de correspondance 1:1 générale, ce mapping ne
// couvre que les locales réellement supportées par l'app (voir i18n/routing.ts).
const DATE_LOCALE_TAG: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
};

export function formatFooterDate(date: Date, locale: string): string {
  return date
    .toLocaleDateString(DATE_LOCALE_TAG[locale] ?? "fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}
