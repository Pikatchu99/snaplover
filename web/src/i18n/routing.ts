import { defineRouting } from "next-intl/routing";

// fr = langue par défaut, sans préfixe d'URL (localePrefix "as-needed") :
// les URLs déjà en prod/indexées (snaplover.hbdwall.xyz/create...) restent
// inchangées. Seul l'anglais ajoute un préfixe (/en/create...).
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
