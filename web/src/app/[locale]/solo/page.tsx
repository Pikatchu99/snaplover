import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { SoloClient } from "@/components/solo/SoloClient";
import { parseSoloConfig } from "@/lib/solo-config";

interface SoloPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Solo (classique ou challenge, docs/STICKER-CHALLENGES.md) : capture 100%
// locale, sans room ni WebRTC — contrairement à /r/[code], rien à protéger de
// l'indexation (aucune identité de room privée dans cette URL).
export default async function SoloPage({ params, searchParams }: SoloPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const config = parseSoloConfig(await searchParams);

  // Le prénom reste requis en solo (signature du footer) — pas d'équivalent
  // "/join" pour le solo (personne à rejoindre), donc un lien direct sans nom
  // renvoie simplement vers /create plutôt que de retomber sur un prénom
  // générique silencieux.
  if (!config.name) {
    redirect({ href: "/create", locale });
  }

  return (
    <SoloClient
      poses={config.poses}
      frameId={config.frameId}
      style={config.style}
      mode={config.mode}
      stickerPackId={config.stickerPackId}
      name={config.name ?? ""}
    />
  );
}
