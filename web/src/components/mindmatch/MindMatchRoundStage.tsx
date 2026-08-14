"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import type { UseMindMatchSessionReturn } from "@/hooks/use-mindmatch-session";

interface MindMatchRoundStageProps {
  session: UseMindMatchSessionReturn;
}

function AttemptFeed({ attempts }: { attempts: UseMindMatchSessionReturn["attempts"] }) {
  if (attempts.length === 0) return null;
  return (
    <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
      {attempts.map((attempt) => (
        <li
          key={attempt.attempt}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm"
        >
          <span className="text-white/80">
            {attempt.myWord} <span className="text-white/30">/</span> {attempt.peerWord}
          </span>
          {attempt.converged ? (
            <Check className="size-4 shrink-0 text-emerald-400" />
          ) : (
            <X className="size-4 shrink-0 text-white/30" />
          )}
        </li>
      ))}
    </ul>
  );
}

// Écran de manche — voir hooks/use-mindmatch-session.ts pour la machine à
// états. Les deux côtés voient exactement le même écran (rôles symétriques,
// contrairement à Doodle Duel) : soit on tape son mot en secret ("guessing"),
// soit on regarde la révélation ("reveal").
export function MindMatchRoundStage({ session }: MindMatchRoundStageProps) {
  const t = useTranslations("mindMatchRound");
  const [wordInput, setWordInput] = useState("");

  const roundLabel = t("roundLabel", { current: session.round + 1, total: session.totalRounds });
  const attemptLabel = session.attempt > 0 ? t("attemptLabel", { attempt: session.attempt + 1 }) : null;

  if (session.phase === "guessing") {
    if (session.myWord) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
          <p className="text-sm text-white/60">{t("waitingForPartner")}</p>
          <h2 className="font-heading text-3xl font-extrabold text-white">{session.myWord}</h2>
          <AttemptFeed attempts={session.attempts} />
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
          {roundLabel}
          {attemptLabel ? ` · ${attemptLabel}` : ""}
        </p>
        <h2 className="font-heading text-xl font-bold text-white">{t("prompt")}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            session.submitWord(wordInput);
            setWordInput("");
          }}
          className="flex w-full max-w-xs gap-2"
        >
          <input
            value={wordInput}
            onChange={(event) => setWordInput(event.target.value)}
            placeholder={t("wordPlaceholder")}
            autoFocus
            className="flex-1 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-center text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("submit")}
          </button>
        </form>
        <AttemptFeed attempts={session.attempts} />
      </div>
    );
  }

  if (session.phase === "reveal") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <div className="flex items-center gap-4">
          <h2 className="font-heading text-2xl font-extrabold text-white">{session.myWord}</h2>
          <span className="text-white/30">/</span>
          <h2 className="font-heading text-2xl font-extrabold text-white">{session.peerWord}</h2>
        </div>
        <p className={session.converged ? "text-emerald-400" : "text-white/50"}>
          {session.converged ? t("converged") : t("notConverged")}
        </p>
        <button
          onClick={session.continueAfterReveal}
          className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {session.converged ? (session.isLastRound ? t("seeRecap") : t("nextRound")) : t("retry")}
        </button>
        <AttemptFeed attempts={session.attempts} />
      </div>
    );
  }

  return null;
}
