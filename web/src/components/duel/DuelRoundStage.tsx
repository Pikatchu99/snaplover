"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eraser, X } from "lucide-react";
import { DuelCanvas } from "@/components/duel/DuelCanvas";
import type { UseDuelSessionReturn } from "@/hooks/use-duel-session";

interface DuelRoundStageProps {
  duel: UseDuelSessionReturn;
}

function GuessFeed({ guesses }: { guesses: UseDuelSessionReturn["guesses"] }) {
  const t = useTranslations("duelRound");
  if (guesses.length === 0) return <p className="text-sm text-white/40">{t("noGuessesYet")}</p>;
  return (
    <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
      {guesses.map((guess, index) => (
        <li key={index} className="flex items-center gap-2 text-sm text-white/80">
          {guess.correct === null ? (
            <span className="size-4 shrink-0 rounded-full border border-white/30" />
          ) : guess.correct ? (
            <Check className="size-4 shrink-0 text-emerald-400" />
          ) : (
            <X className="size-4 shrink-0 text-white/30" />
          )}
          {guess.text}
        </li>
      ))}
    </ul>
  );
}

function formatSeconds(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

// Écran de manche — voir hooks/use-duel-session.ts pour la machine à états
// (`phase`). Aucun overlay ne couvre jamais le canvas de dessin : leçon du
// placement raté de Duo Doodle, ici il n'y a même pas de compte à rebours
// visuel qui pourrait gêner (juste un chiffre dans un coin).
export function DuelRoundStage({ duel }: DuelRoundStageProps) {
  const t = useTranslations("duelRound");
  const [guessInput, setGuessInput] = useState("");

  const roundLabel = t("roundLabel", { current: duel.round + 1, total: duel.totalRounds });

  if (duel.phase === "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        {duel.isMyTurnToDraw ? (
          <>
            <h2 className="font-heading text-xl font-bold text-white">{t("yourTurnTitle")}</h2>
            <button
              onClick={duel.startDrawerPrep}
              className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
            >
              {t("seeWord")}
            </button>
          </>
        ) : (
          <p className="text-white/60">{t("waitingForDrawer")}</p>
        )}
      </div>
    );
  }

  if (duel.phase === "drawer-prep") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <p className="text-sm text-white/60">{t("wordIs")}</p>
        <h2 className="font-heading text-4xl font-extrabold text-white">{duel.word}</h2>
        <button
          onClick={duel.confirmStartDrawing}
          className="mt-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {t("startDrawing")}
        </button>
      </div>
    );
  }

  if (duel.phase === "drawing") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
          <span className="font-mono text-lg font-bold text-white">{formatSeconds(duel.remainingMs)}</span>
        </div>

        {duel.isMyTurnToDraw ? (
          <>
            <p className="text-center text-sm text-white/60">{t("drawingInstruction", { word: duel.word ?? "" })}</p>
            <DuelCanvas
              canvasRef={duel.canvasRef}
              strokes={duel.myStrokes}
              interactive
              onPointerDown={duel.handlePointerDown}
              onPointerMove={duel.handlePointerMove}
              onPointerUp={duel.handlePointerUp}
            />
            <button
              onClick={duel.clearDrawing}
              disabled={duel.myStrokes.length === 0}
              className="mx-auto flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-30"
            >
              <Eraser className="size-3.5" />
              {t("clear")}
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-sm text-white/60">{t("guessingInstruction")}</p>
            <DuelCanvas canvasRef={duel.canvasRef} strokes={duel.peerStrokes} />
            <form
              onSubmit={(event) => {
                event.preventDefault();
                duel.submitGuess(guessInput);
                setGuessInput("");
              }}
              className="flex gap-2"
            >
              <input
                value={guessInput}
                onChange={(event) => setGuessInput(event.target.value)}
                placeholder={t("guessPlaceholder")}
                className="flex-1 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                {t("guessSubmit")}
              </button>
            </form>
          </>
        )}

        <GuessFeed guesses={duel.guesses} />
      </div>
    );
  }

  if (duel.phase === "reveal" && duel.lastRound) {
    const { word, guessed, timeMs } = duel.lastRound;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <p className="text-sm text-white/60">{t("theWordWas")}</p>
        <h2 className="font-heading text-3xl font-extrabold text-white">{word}</h2>
        <p className={guessed ? "text-emerald-400" : "text-white/50"}>
          {guessed ? t("guessedIn", { seconds: Math.round(timeMs / 1000) }) : t("notGuessed")}
        </p>
        <button
          onClick={duel.goToNextRound}
          className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {duel.isLastRound ? t("seeRecap") : t("nextRound")}
        </button>
      </div>
    );
  }

  return null;
}
