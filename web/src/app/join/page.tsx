"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/landing/Logo";
import { isValidRoomCode } from "@/lib/room-code";
import { config } from "@/lib/config";
import { fr } from "@/i18n/messages";

const CODE_LENGTH = config.roomCode.length;

// Rejoindre (E2) — SNAPROOM-SPEC.md §12. Champ unique (pas de cases
// séparées) — voir docs/design/snaproom-hifi.dc.html.
export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidRoomCode(code)) {
      setError(true);
      return;
    }
    router.push(`/r/${code.toUpperCase()}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fbf7f1] px-6 py-16 text-center">
      <Logo />

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-semibold tracking-[0.15em] text-[#6a48f4] uppercase">{fr.join.eyebrow}</p>
        <h1 className="font-heading text-3xl font-bold text-[#1c1712]">{fr.join.title}</h1>
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
          aria-label={fr.join.title}
          className="rounded-2xl border border-[#1c1712] bg-white px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-[#1c1712] uppercase placeholder:tracking-normal placeholder:text-base placeholder:font-normal placeholder:text-[#8c8378] focus:outline-none"
        />

        {error && <p className="text-sm text-red-600">{fr.join.invalidCode}</p>}

        <button
          type="submit"
          className="rounded-2xl bg-[#6a48f4] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {fr.join.submit}
        </button>

        <div className="flex items-center gap-3 text-xs text-[#8c8378]">
          <span className="h-px flex-1 bg-[#ece4d8]" />
          ou
          <span className="h-px flex-1 bg-[#ece4d8]" />
        </div>

        <Link
          href="/create"
          className="rounded-2xl border border-[#ece4d8] px-6 py-3 font-medium text-[#1c1712] transition hover:bg-[#ece4d8]/40"
        >
          {fr.join.createInstead}
        </Link>
      </form>

      <p className="text-xs text-[#8c8378]">{fr.join.noAccount}</p>
    </main>
  );
}
