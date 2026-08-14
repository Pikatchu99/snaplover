"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { roomKindFromCode, type RoomKind } from "@/lib/room-code";
import { useRouter } from "@/i18n/navigation";

interface InlineJoinFieldProps {
  dark?: boolean;
}

// Un seul chemin de room par type, jamais deviné ailleurs — voir
// lib/room-code.ts (préfixe de code) pour pourquoi cette table existe.
const ROOM_PATH: Record<RoomKind, string> = {
  photo: "/r",
  duel: "/duel/r",
  mindmatch: "/mindmatch/r",
};

// Champ "coller le lien / code" de la landing (E1) — accepte un lien complet
// (/r/CODE..., /duel/r/CODE..., /mindmatch/r/CODE...) ou un code brut, et
// redirige vers la bonne room. Avant le préfixe de code par type (voir
// lib/room-code.ts), ce champ redirigeait toujours vers /r/ — un code de
// duel collé ici atterrissait sur une room photo inexistante.
export function InlineJoinField({ dark }: InlineJoinFieldProps) {
  const router = useRouter();
  const tLanding = useTranslations("landing");
  const tJoin = useTranslations("join");
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const match = value.match(/([A-Z0-9]{4,8})(?:\?.*)?$/i);
    const code = (match ? match[1] : value).trim().toUpperCase();
    const kind = roomKindFromCode(code);
    if (!kind) return;
    router.push(`${ROOM_PATH[kind]}/${code}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-1.5 rounded-2xl border p-1.5 ${
        dark ? "border-white/20 bg-white/5" : "border-[#ece4d8] bg-white"
      }`}
    >
      {/* text-base (16px), pas text-sm : sous ce seuil, Safari iOS zoome
          automatiquement toute la page au focus d'un champ. */}
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={tLanding("pasteLinkPlaceholder")}
        className={`w-40 bg-transparent px-2.5 text-base outline-none sm:w-48 ${
          dark ? "text-white placeholder:text-white/40" : "text-[#1c1712] placeholder:text-[#8c8378]"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          dark ? "bg-white text-[#161319] hover:opacity-90" : "bg-[#1c1712] text-white hover:opacity-90"
        }`}
      >
        {tJoin("submit")}
      </button>
    </form>
  );
}
