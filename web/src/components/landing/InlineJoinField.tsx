"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidRoomCode } from "@/lib/room-code";
import { fr } from "@/i18n/messages";

interface InlineJoinFieldProps {
  dark?: boolean;
}

// Champ "coller le lien / code" de la landing (E1) — accepte un lien complet
// (/r/CODE...) ou un code brut, et redirige vers la room.
export function InlineJoinField({ dark }: InlineJoinFieldProps) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const match = value.match(/([A-Z0-9]{4,8})(?:\?.*)?$/i);
    const code = (match ? match[1] : value).trim().toUpperCase();
    if (!isValidRoomCode(code)) return;
    router.push(`/r/${code}`);
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
        placeholder={fr.landing.pasteLinkPlaceholder}
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
        {fr.join.submit}
      </button>
    </form>
  );
}
