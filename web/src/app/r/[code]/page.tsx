import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoomClient } from "@/components/room/RoomClient";
import { parseRoomConfig } from "@/lib/room-config";
import { isValidRoomCode } from "@/lib/room-code";

// Room éphémère/privée (un lien = deux personnes précises) : jamais indexée,
// jamais suivie — voir aussi app/robots.ts (`disallow: "/r/"`).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface RoomPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const { code } = await params;
  const config = parseRoomConfig(await searchParams);

  // Un prénom est requis pour entrer — /create et /join le garantissent déjà
  // côté client, mais un lien collé directement (sans passer par ces pages)
  // contourne cette validation. On redirige plutôt que de retomber
  // silencieusement sur un prénom générique. Seulement si le code a une
  // forme valide : un code malformé doit continuer vers RoomClient pour
  // afficher l'état dédié "lien introuvable/expiré" (Lobby), pas être masqué
  // par cette redirection.
  if (!config.name && isValidRoomCode(code)) {
    redirect(`/join?code=${code.toUpperCase()}`);
  }

  return (
    <RoomClient
      code={code.toUpperCase()}
      poses={config.poses}
      frameId={config.frameId}
      style={config.style}
      // Vide seulement si le code est malformé (cf. garde ci-dessus) — dans
      // ce cas la room n'ira jamais jusqu'à l'échange de prénom (le pair
      // n'existe pas), la valeur n'est donc jamais montrée à l'utilisateur.
      name={config.name ?? ""}
    />
  );
}
