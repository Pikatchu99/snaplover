"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Download, Share2 } from "lucide-react";
import {
  activeBoard,
  buildSubBoardCells,
  buildSubBoardResults,
  checkMetaResult,
} from "@/lib/uttt/win-check";
import { composeUtttRecap } from "@/lib/uttt/compose-recap";
import { shareOrDownload } from "@/lib/share-or-download";
import type { UseUtttSessionReturn } from "@/hooks/use-uttt-session";

interface UtttBoardProps {
  session: UseUtttSessionReturn;
}

const X_COLOR = "#fb5a46";
const O_COLOR = "#fbf7f1";

// Plateau Ultimate Tic-Tac-Toe — méta-grille 3x3 de neuf sous-plateaux 3x3
// (voir hooks/use-uttt-session.ts, lib/uttt/win-check.ts). Le SEUL retour
// visuel qui compte vraiment ici (plus que n'importe quelle animation,
// voir CLAUDE.md) : le ou les sous-plateaux actuellement jouables sont mis
// en avant (anneau corail), tout le reste est visuellement estompé et
// non cliquable. Un sous-plateau décidé arrête de montrer ses marques
// individuelles et affiche un grand X/O (ou un trait pour nul) sur toute sa
// surface, comme au jeu physique. Pas d'écran de récap séparé (même
// convention que Connect Duo/Fleet Siege) : "Rejouer" repart directement
// sur le même plateau vide, la caméra ne s'arrête donc jamais ici.
export function UtttBoard({ session }: UtttBoardProps) {
  const t = useTranslations("utttRound");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const subCells = buildSubBoardCells(session.moves);
  const subResults = buildSubBoardResults(session.moves);
  const metaResult = checkMetaResult(subResults);
  const active = activeBoard(session.moves, subResults);
  const gameOver = metaResult !== null;

  const outcomeText =
    metaResult === "draw" ? t("draw") : metaResult === session.mySymbol ? t("youWon") : gameOver ? t("partnerWon") : "";

  useEffect(() => {
    if (!gameOver) return;
    let cancelled = false;
    composeUtttRecap(session.moves, { outcomeText, footerText: t("footerText") }).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
      setImageUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, session.moves]);

  async function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "snaplover-uttt.png";
    a.click();
  }

  async function handleShare() {
    if (!imageUrl) return;
    await shareOrDownload(imageUrl, "snaplover-uttt.png", t("shareText"));
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {!gameOver && (
        <p className="text-center text-sm text-white/60">{session.isMyTurn ? t("yourTurn") : t("partnerTurn")}</p>
      )}

      <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, boardIndex) => {
          const result = subResults[boardIndex];
          const isBoardActive = !gameOver && (active === null ? result === "open" : active === boardIndex);
          return (
            <div
              key={boardIndex}
              data-uttt-board={boardIndex}
              data-uttt-board-active={isBoardActive}
              className={`grid grid-cols-3 gap-1 rounded-xl p-1.5 transition ${
                isBoardActive ? "bg-white/10 ring-2 ring-[#fb5a46]" : "bg-white/5 opacity-50"
              }`}
            >
              {result !== "open" ? (
                <div className="col-span-3 row-span-3 flex aspect-square items-center justify-center">
                  {result === "won-x" && <span className="font-heading text-4xl font-black text-[#fb5a46]">X</span>}
                  {result === "won-o" && <span className="font-heading text-4xl font-black text-[#fbf7f1]">O</span>}
                  {result === "draw" && <span className="h-1 w-2/3 rounded-full bg-white/30" />}
                </div>
              ) : (
                Array.from({ length: 9 }, (_, cellIndex) => {
                  const cell = subCells[boardIndex][cellIndex];
                  const clickable = isBoardActive && session.isMyTurn && !cell;
                  return (
                    <button
                      key={cellIndex}
                      data-uttt-cell={`${boardIndex}-${cellIndex}`}
                      onClick={() => session.playMove(boardIndex, cellIndex)}
                      disabled={!clickable}
                      className="flex aspect-square items-center justify-center rounded-md bg-[#1c1a20]"
                    >
                      {cell && (
                        <motion.span
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="text-sm font-bold"
                          style={{ color: cell === "X" ? X_COLOR : O_COLOR }}
                        >
                          {cell}
                        </motion.span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {gameOver && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-heading text-xl font-bold text-white">{outcomeText}</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleDownload}
              disabled={!imageUrl}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <Download className="size-4" />
              {t("download")}
            </button>
            <button
              onClick={handleShare}
              disabled={!imageUrl}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <Share2 className="size-4" />
              {t("share")}
            </button>
          </div>

          <button
            onClick={session.rematch}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            {t("rematch")}
          </button>
        </div>
      )}
    </div>
  );
}
