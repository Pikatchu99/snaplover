"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { BingoCardGrid } from "@/components/bingo/BingoCardGrid";
import type { UseBingoSessionReturn } from "@/hooks/use-bingo-session";

interface BingoRoundStageProps {
  session: UseBingoSessionReturn;
}

// Écran de manche — voir hooks/use-bingo-session.ts. AUCUN tour : marquer
// sa carte et réclamer une ligne sont possibles à tout instant pour les
// deux côtés, jamais gatés sur "à qui le tour" (voir CLAUDE.md "Bingo").
// Layout identique pour les deux côtés, qu'on donne les numéros cette
// manche ou non — le·la donneur·se marque et peut réclamer exactement
// comme l'autre.
export function BingoRoundStage({ session }: BingoRoundStageProps) {
  const t = useTranslations("bingoRound");
  const roundLabel = t("roundLabel", { current: session.round + 1, total: session.totalRounds });

  const myScore = session.mySide === "host" ? session.scores.host : session.scores.guest;
  const partnerScore = session.mySide === "host" ? session.scores.guest : session.scores.host;

  function resultText() {
    if (!session.result) return "";
    if (session.result.winner === "draw") return t("draw");
    return session.result.winner === session.mySide ? t("youWon") : t("partnerWon");
  }

  function lineTypeText() {
    if (!session.result) return "";
    if (session.result.lineType === "row") return t("lineRow");
    if (session.result.lineType === "col") return t("lineCol");
    return t("lineDiag");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span>
            {t("you")} <strong className="text-white">{myScore}</strong>
          </span>
          <span>·</span>
          <span>
            {t("partner")} <strong className="text-white">{partnerScore}</strong>
          </span>
        </div>
      </div>

      {session.phase === "calling" && session.card && (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-20 items-center justify-center rounded-full bg-white/10 font-heading text-3xl font-black text-white">
              {session.currentNumber ?? "—"}
            </div>
            {session.calledNumbers.length > 0 && (
              <div className="flex max-w-full flex-wrap justify-center gap-1.5 overflow-x-auto">
                {session.calledNumbers.map((number, index) => (
                  <span
                    key={index}
                    className="flex size-6 items-center justify-center rounded-full bg-white/5 text-[11px] text-white/50"
                  >
                    {number}
                  </span>
                ))}
              </div>
            )}
          </div>

          <BingoCardGrid card={session.card} calledNumbers={session.calledNumbers} />

          <button
            onClick={session.claim}
            disabled={!session.claimArmed || session.myClaimSubmitted}
            className="mx-auto rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-8 py-3.5 font-medium text-white transition hover:opacity-90 disabled:from-white/15 disabled:to-white/15 disabled:text-white/50"
          >
            {session.myClaimSubmitted ? t("claimSubmitted") : t("claimButton")}
          </button>
        </div>
      )}

      {session.phase === "reveal" && session.result && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="font-heading text-xl font-bold text-white">{resultText()}</p>
          <p className="text-sm text-white/60">{t("lineText", { line: lineTypeText() })}</p>
          {session.fairnessFailed && (
            <p className="flex items-center gap-1.5 text-xs text-[#fb5a46]">
              <AlertTriangle className="size-3.5" />
              {t("fairnessFailed")}
            </p>
          )}
          <button
            onClick={session.continueAfterReveal}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            {session.round + 1 >= session.totalRounds ? t("seeRecap") : t("nextRound")}
          </button>
        </div>
      )}
    </div>
  );
}
