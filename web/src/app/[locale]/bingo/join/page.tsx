"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Hash } from "lucide-react";
import { isValidRoomCode, roomKindFromCode } from "@/lib/room-code";
import { config } from "@/lib/config";
import { Link, useRouter } from "@/i18n/navigation";

const CODE_LENGTH = config.roomCode.length;

// Rejoindre un Bingo — champ code uniquement, pas de prénom (voir
// app/[locale]/bingo/page.tsx).
export default function JoinBingoPage() {
  const router = useRouter();
  const t = useTranslations("bingoJoin");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // roomKindFromCode (pas juste isValidRoomCode) : sans ça, un code d'un
    // autre jeu collé ici redirigeait vers un Bingo inexistant (voir
    // lib/room-code.ts).
    if (!isValidRoomCode(code) || roomKindFromCode(code) !== "bingo") {
      setError(true);
      return;
    }
    router.push(`/bingo/r/${code.toUpperCase()}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fbf7f1] px-6 pt-16 pb-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-[#6a48f4] text-white">
        <Hash className="size-8" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-semibold tracking-[0.15em] text-[#6a48f4] uppercase">{t("eyebrow")}</p>
        <h1 className="font-heading text-3xl font-bold text-[#1c1712]">{t("title")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col items-stretch gap-4">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value.slice(0, CODE_LENGTH));
            setError(false);
          }}
          maxLength={CODE_LENGTH}
          inputMode="text"
          autoFocus
          aria-label={t("title")}
          className="rounded-2xl border border-[#1c1712] bg-white px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-[#1c1712] uppercase placeholder:tracking-normal placeholder:text-base placeholder:font-normal placeholder:text-[#8c8378] focus:outline-none"
        />

        {error && <p className="text-sm text-red-600">{t("invalidCode")}</p>}

        <button
          type="submit"
          className="rounded-2xl bg-[#6a48f4] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {t("submit")}
        </button>

        <div className="flex items-center gap-3 text-xs text-[#8c8378]">
          <span className="h-px flex-1 bg-[#ece4d8]" />
          {t("or")}
          <span className="h-px flex-1 bg-[#ece4d8]" />
        </div>

        <Link
          href="/bingo"
          className="rounded-2xl border border-[#ece4d8] px-6 py-3 font-medium text-[#1c1712] transition hover:bg-[#ece4d8]/40"
        >
          {t("createInstead")}
        </Link>
      </form>
    </main>
  );
}
