import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { UtttClient } from "@/components/uttt/UtttClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/uttt/r/"`, généré depuis lib/games/registry.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface UtttRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que les autres jeux) : un code
// malformé continue quand même vers UtttClient, qui affichera l'état "lien
// invalide" (le signaling valide le format).
export default async function UtttRoomPage({ params }: UtttRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <UtttClient code={code.toUpperCase()} />;
}
