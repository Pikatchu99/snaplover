import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CopyCatClient } from "@/components/copy-cat/CopyCatClient";

// Room éphémère/privée — jamais indexée, voir aussi app/robots.ts
// (`disallow: "/copy-cat/r/"`, généré depuis lib/games/registry.ts).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface CopyCatRoomPageProps {
  params: Promise<{ locale: string; code: string }>;
}

// Pas de prénom requis (même choix de scope que les autres jeux) : un code
// malformé continue quand même vers CopyCatClient, qui affichera l'état
// "lien invalide" (le signaling valide le format).
export default async function CopyCatRoomPage({ params }: CopyCatRoomPageProps) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <CopyCatClient code={code.toUpperCase()} />;
}
