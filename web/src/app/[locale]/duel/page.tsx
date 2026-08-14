"use client";

import { Palette } from "lucide-react";
import { generateRoomCode } from "@/lib/room-code";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// Créer un duel — pas de prénom ni de config à renseigner (contrairement à
// /create) : Doodle Duel n'a besoin que d'une room à deux, voir
// CLAUDE.md "Doodle Duel" pour le choix de scope de ce MVP.
export default function CreateDuelPage() {
  const router = useRouter();
  const t = useTranslations("duelCreate");

  function handleCreate() {
    const code = generateRoomCode();
    router.push(`/duel/r/${code}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fbf7f1] px-6 pt-16 pb-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-[#6a48f4] to-[#fb5a46] text-white">
        <Palette className="size-8" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-semibold tracking-[0.15em] text-[#6a48f4] uppercase">{t("eyebrow")}</p>
        <h1 className="font-heading text-3xl font-bold text-[#1c1712]">{t("title")}</h1>
        <p className="max-w-sm text-sm text-[#8c8378]">{t("description")}</p>
      </div>

      <button
        onClick={handleCreate}
        className="rounded-2xl bg-linear-to-r from-[#6a48f4] to-[#fb5a46] px-6 py-3 font-medium text-white transition hover:opacity-90"
      >
        {t("submit")}
      </button>

      <p className="text-xs text-[#8c8378]">{t("noAccount")}</p>
    </main>
  );
}
