"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isValidRoomCode } from "@/lib/room-code";
import { config } from "@/lib/config";
import { fr } from "@/i18n/messages";

const CODE_LENGTH = config.roomCode.length;

// Rejoindre (E2) — SNAPROOM-SPEC.md §12.
export default function JoinPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigit(index: number, value: string) {
    const char = value.slice(-1).toUpperCase();
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(false);
    if (char && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = digits.join("");
    if (!isValidRoomCode(code)) {
      setError(true);
      return;
    }
    router.push(`/r/${code}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fbf7f1] px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-[#8c8378]">{fr.join.eyebrow}</p>
        <h1 className="font-heading text-3xl font-bold text-[#1c1712]">{fr.join.title}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              maxLength={1}
              inputMode="text"
              aria-label={fr.join.codeInputLabel(index + 1)}
              className="h-14 w-12 rounded-xl border border-[#ece4d8] bg-white text-center font-mono text-xl font-bold uppercase text-[#1c1712] focus:border-[#fb5a46] focus:outline-none"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{fr.join.invalidCode}</p>}

        <button
          type="submit"
          className="rounded-full bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {fr.join.submit}
        </button>
      </form>

      <Link href="/create" className="text-sm font-medium text-[#1c1712] underline underline-offset-4">
        {fr.join.createInstead}
      </Link>

      <p className="text-xs text-[#8c8378]">{fr.join.noAccount}</p>
    </main>
  );
}
