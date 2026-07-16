import type { Metadata } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { fr } from "@/i18n/messages";
import { metadataBase, SITE_URL } from "@/lib/site";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase,
  title: {
    template: fr.seo.titleTemplate,
    default: fr.seo.defaultTitle,
  },
  description: fr.seo.defaultDescription,
  keywords: [...fr.seo.keywords],
  openGraph: {
    title: fr.seo.defaultTitle,
    description: fr.seo.defaultDescription,
    url: SITE_URL ?? "/",
    siteName: fr.seo.siteName,
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: fr.seo.defaultTitle,
    description: fr.seo.defaultDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${bricolageGrotesque.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {UMAMI_SCRIPT_URL && UMAMI_WEBSITE_ID && (
          <Script src={UMAMI_SCRIPT_URL} data-website-id={UMAMI_WEBSITE_ID} strategy="afterInteractive" />
        )}
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
