import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { EdgeLettersClient } from "@/components/edge-letters/EdgeLettersClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/edge-letters/r/"`, généré depuis lib/games/registry.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface EdgeLettersRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que les autres jeux) : un code
// malformé continue quand même vers EdgeLettersClient, qui affichera l'état
// "lien invalide" (le signaling valide le format).
export default async function EdgeLettersRoomPage({ params }: EdgeLettersRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <EdgeLettersClient code={code.toUpperCase()} />;
}
