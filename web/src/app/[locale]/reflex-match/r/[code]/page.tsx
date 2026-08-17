import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ReflexMatchClient } from "@/components/reflex-match/ReflexMatchClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/reflex-match/r/"`, généré depuis lib/games/registry.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface ReflexMatchRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que les autres jeux) : un code
// malformé continue quand même vers ReflexMatchClient, qui affichera
// l'état "lien invalide" (le signaling valide le format).
export default async function ReflexMatchRoomPage({ params }: ReflexMatchRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <ReflexMatchClient code={code.toUpperCase()} />;
}
