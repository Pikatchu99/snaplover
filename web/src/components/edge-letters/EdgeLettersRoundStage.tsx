"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { UseEdgeLettersSessionReturn } from "@/hooks/use-edge-letters-session";

interface EdgeLettersRoundStageProps {
  session: UseEdgeLettersSessionReturn;
  isInitiator: boolean;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function formatSeconds(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

// Écran de manche — voir hooks/use-edge-letters-session.ts. Trois phases :
// "picking" (chacun·e choisit sa lettre, rôle début/fin alterné par
// manche), "racing" (aucun tour, course libre pour taper un mot valide),
// "reveal" (résultat). Remonté à chaque manche (key={round} côté
// EdgeLettersClient.tsx) pour repartir d'un état local vierge.
export function EdgeLettersRoundStage({ session, isInitiator }: EdgeLettersRoundStageProps) {
  const t = useTranslations("edgeLettersRound");
  const [wordInput, setWordInput] = useState("");
  const [invalidFlash, setInvalidFlash] = useState(false);

  const roundLabel = t("roundLabel", { current: session.round + 1, total: session.totalRounds });

  if (session.phase === "picking") {
    if (session.myLetterPicked) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
          <p className="text-sm text-white/60">{t("waitingForPartnerLetter")}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <h2 className="font-heading text-xl font-bold text-white">
          {session.myRole === "start" ? t("pickStartPrompt") : t("pickEndPrompt")}
        </h2>
        <div className="mx-auto grid max-w-md grid-cols-7 gap-1.5 sm:grid-cols-9">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => session.pickLetter(letter)}
              className="rounded-lg bg-white/10 px-2 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (session.phase === "racing") {
    const warning = session.raceRemainingMs <= 10_000;
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
          <span className={`font-mono text-lg font-bold ${warning ? "text-[#fb5a46]" : "text-white"}`}>
            {formatSeconds(session.raceRemainingMs)}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <h2 className="font-heading text-3xl font-extrabold text-white">{session.startLetter}</h2>
          <span className="text-white/30">…</span>
          <h2 className="font-heading text-3xl font-extrabold text-white">{session.endLetter}</h2>
        </div>

        {session.myClaimSubmitted ? (
          <p className="text-center text-sm text-white/60">{t("waitingForResult")}</p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const accepted = session.submitClaim(wordInput);
              if (!accepted) {
                setInvalidFlash(true);
                setTimeout(() => setInvalidFlash(false), 500);
              }
            }}
            className="mx-auto flex w-full max-w-xs flex-col items-stretch gap-2"
          >
            <input
              value={wordInput}
              onChange={(event) => {
                setWordInput(event.target.value);
                setInvalidFlash(false);
              }}
              placeholder={t("wordPlaceholder")}
              disabled={!session.wordSetReady}
              autoFocus
              className={`rounded-2xl border bg-white/5 px-4 py-2.5 text-center text-white placeholder:text-white/40 focus:outline-none ${
                invalidFlash ? "border-[#fb5a46]" : "border-white/20 focus:border-white/40"
              }`}
            />
            {invalidFlash && <p className="text-xs text-[#fb5a46]">{t("invalidWord")}</p>}
            <button
              type="submit"
              disabled={!session.wordSetReady || wordInput.trim().length === 0}
              className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {session.wordSetReady ? t("submitWord") : t("loadingDictionary")}
            </button>
          </form>
        )}
      </div>
    );
  }

  if (session.phase === "reveal" && session.lastResult) {
    const { winner, word } = session.lastResult;
    const myOutcome = winner === null ? "draw" : winner === (isInitiator ? "host" : "guest") ? "won" : "lost";
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <p className="text-sm text-white/60">
          {myOutcome === "draw" ? t("roundDraw") : myOutcome === "won" ? t("youWonRound") : t("partnerWonRound")}
        </p>
        {word && <h2 className="font-heading text-3xl font-extrabold text-white">{word}</h2>}
        <button
          onClick={session.continueAfterReveal}
          className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {session.isLastRound ? t("seeRecap") : t("nextRound")}
        </button>
      </div>
    );
  }

  return null;
}
