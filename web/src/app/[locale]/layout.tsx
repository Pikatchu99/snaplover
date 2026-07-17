import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bricolage_Grotesque, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { SiteCredit } from "@/components/layout/SiteCredit";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { routing } from "@/i18n/routing";
import { metadataBase, SITE_URL } from "@/lib/site";
import "../globals.css";

// Analytics (Umami auto-hébergé) — entièrement optionnel, désactivé si les
// variables d'env ne sont pas renseignées (voir CLAUDE.md "Aucune valeur
// d'infra en dur" : URL/ID varient selon le déploiement, jamais en dur ici).
const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const OG_LOCALE: Record<string, string> = { fr: "fr_FR", en: "en_US" };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  // fr = pas de préfixe (localePrefix "as-needed", voir i18n/routing.ts).
  const localizedPath = (path: string) => (locale === routing.defaultLocale ? path : `/${locale}${path}`);

  return {
    metadataBase,
    title: {
      template: t("titleTemplate"),
      default: t("defaultTitle"),
    },
    description: t("defaultDescription"),
    keywords: t.raw("keywords") as string[],
    alternates: {
      languages: Object.fromEntries(routing.locales.map((loc) => [loc, localizedPath("/")])),
    },
    openGraph: {
      title: t("defaultTitle"),
      description: t("defaultDescription"),
      url: SITE_URL ? `${SITE_URL}${localizedPath("/")}` : localizedPath("/"),
      siteName: t("siteName"),
      locale: OG_LOCALE[locale] ?? "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("defaultTitle"),
      description: t("defaultDescription"),
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Rend `getTranslations`/`useTranslations` sans locale explicite valables
  // dans tout l'arbre serveur en dessous (requis en rendu statique).
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${bricolageGrotesque.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {UMAMI_SCRIPT_URL && UMAMI_WEBSITE_ID && (
          <Script src={UMAMI_SCRIPT_URL} data-website-id={UMAMI_WEBSITE_ID} strategy="afterInteractive" />
        )}
        <NextIntlClientProvider>
          <QueryProvider>{children}</QueryProvider>
          <LanguageSwitcher />
          <SiteCredit />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
