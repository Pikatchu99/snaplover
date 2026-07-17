"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABEL: Record<string, string> = {
  fr: "FR",
  en: "EN",
};

// Petit switch en haut de page — change la locale sans perdre la page
// courante (usePathname/useRouter de next-intl gèrent le préfixe /en tout
// seuls, voir i18n/navigation.ts).
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("languageSwitcher");

  return (
    // Fond sombre translucide (comme SiteCredit) : reste lisible aussi bien
    // sur les pages claires (landing/create/join) que sombres (lobby/séance)
    // sans avoir à connaître le thème de la page qui l'affiche.
    <div className="fixed top-3 right-3 z-50 flex gap-1 rounded-full bg-black/70 p-1 text-xs font-medium backdrop-blur-sm">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => router.replace(pathname, { locale: loc })}
          aria-label={`${t("label")}: ${LOCALE_LABEL[loc]}`}
          aria-current={loc === locale}
          className={`rounded-full px-2.5 py-1 transition ${
            loc === locale ? "bg-white text-[#1c1712]" : "text-white/70 hover:bg-white/10"
          }`}
        >
          {LOCALE_LABEL[loc]}
        </button>
      ))}
    </div>
  );
}
