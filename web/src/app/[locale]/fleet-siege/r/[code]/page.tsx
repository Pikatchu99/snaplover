import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FleetSiegeClient } from "@/components/fleet-siege/FleetSiegeClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/fleet-siege/r/"`, généré depuis lib/games/registry.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface FleetSiegeRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que les autres jeux) : un code
// malformé continue quand même vers FleetSiegeClient, qui affichera l'état
// "lien invalide" (le signaling valide le format).
export default async function FleetSiegeRoomPage({ params }: FleetSiegeRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <FleetSiegeClient code={code.toUpperCase()} />;
}
