import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DuelClient } from "@/components/duel/DuelClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/duel/r/"`).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface DuelRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (contrairement à /r/[code]) : Doodle Duel n'affiche
// que des labels génériques ("Toi"/"Partenaire") — voir CLAUDE.md "Doodle
// Duel" pour le choix de scope de ce MVP. Un code malformé continue quand
// même vers DuelClient, qui affichera l'état "lien invalide" (même
// mécanisme que la room photo — le signaling valide le format).
export default async function DuelRoomPage({ params }: DuelRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <DuelClient code={code.toUpperCase()} />;
}
