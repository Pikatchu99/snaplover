import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DuoQuizClient } from "@/components/duo-quiz/DuoQuizClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/duo-quiz/r/"`, généré depuis lib/games/registry.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface DuoQuizRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que les autres jeux) : un code
// malformé continue quand même vers DuoQuizClient, qui affichera l'état
// "lien invalide" (le signaling valide le format).
export default async function DuoQuizRoomPage({ params }: DuoQuizRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <DuoQuizClient code={code.toUpperCase()} />;
}
