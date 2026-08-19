import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ConnectDuoClient } from "@/components/connect-duo/ConnectDuoClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/connect-duo/r/"`, généré depuis lib/games/registry.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface ConnectDuoRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que /duel/r/[code],
// /word-sonar/r/[code]) : un code malformé continue quand même vers
// ConnectDuoClient, qui affichera l'état "lien invalide" (le signaling
// valide le format).
export default async function ConnectDuoRoomPage({ params }: ConnectDuoRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <ConnectDuoClient code={code.toUpperCase()} />;
}
