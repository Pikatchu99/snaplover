import { setRequestLocale } from "next-intl/server";
import { SoloClient } from "@/components/solo/SoloClient";
import { parseSoloConfig } from "@/lib/solo-config";

interface SoloPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Challenge solo (docs/STICKER-CHALLENGES.md) : capture 100% locale, sans
// room ni WebRTC — contrairement à /r/[code], rien à protéger de l'indexation
// (aucune identité de room privée dans cette URL).
export default async function SoloPage({ params, searchParams }: SoloPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const config = parseSoloConfig(await searchParams);

  return <SoloClient poses={config.poses} frameId={config.frameId} stickerPackId={config.stickerPackId} />;
}
