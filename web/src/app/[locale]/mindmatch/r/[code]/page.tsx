import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MindMatchClient } from "@/components/mindmatch/MindMatchClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/mindmatch/r/"`).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface MindMatchRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que /duel/r/[code]) : un code
// malformé continue quand même vers MindMatchClient, qui affichera l'état
// "lien invalide" (le signaling valide le format).
export default async function MindMatchRoomPage({ params }: MindMatchRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <MindMatchClient code={code.toUpperCase()} />;
}
