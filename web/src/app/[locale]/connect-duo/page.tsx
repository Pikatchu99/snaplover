"use client";

import { Circle } from "lucide-react";
import { generateRoomCode } from "@/lib/room-code";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// Créer une partie de Connect Duo — pas de prénom ni de config à renseigner
// (même choix de scope que /duel, /word-sonar) : aucun réglage à faire, le
// jeu se lance directement depuis la salle d'attente.
export default function CreateConnectDuoPage() {
  const router = useRouter();
  const t = useTranslations("connectDuoCreate");

  function handleCreate() {
    const code = generateRoomCode("connect-duo");
    router.push(`/connect-duo/r/${code}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fbf7f1] px-6 pt-16 pb-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-[#fb5a46] to-[#ff7d54] text-white">
        <Circle className="size-8" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-semibold tracking-[0.15em] text-[#fb5a46] uppercase">{t("eyebrow")}</p>
        <h1 className="font-heading text-3xl font-bold text-[#1c1712]">{t("title")}</h1>
        <p className="max-w-sm text-sm text-[#8c8378]">{t("description")}</p>
      </div>

      <button
        onClick={handleCreate}
        className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
      >
        {t("submit")}
      </button>

      <p className="text-xs text-[#8c8378]">{t("noAccount")}</p>
    </main>
  );
}
