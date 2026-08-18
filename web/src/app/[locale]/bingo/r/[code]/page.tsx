import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BingoClient } from "@/components/bingo/BingoClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/bingo/r/"`, généré depuis lib/games/registry.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface BingoRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que les autres jeux) : un code
// malformé continue quand même vers BingoClient, qui affichera l'état
// "lien invalide" (le signaling valide le format).
export default async function BingoRoomPage({ params }: BingoRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <BingoClient code={code.toUpperCase()} />;
}
