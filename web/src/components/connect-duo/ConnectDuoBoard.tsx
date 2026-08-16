"use client";

import { useTranslations } from "next-intl";
import { buildBoard, isColumnFull, type Disc } from "@/lib/connect-duo/board";
import type { UseConnectDuoSessionReturn } from "@/hooks/use-connect-duo-session";

interface ConnectDuoBoardProps {
  session: UseConnectDuoSessionReturn;
  isInitiator: boolean;
}

// Jamais de violet ici (réservé au chemin "rejoindre", voir CLAUDE.md) — le
// disque de l'hôte reprend le corail déjà utilisé comme couleur d'action
// primaire partout ailleurs dans l'app, celui de l'invité·e l'encre sombre.
const HOST_COLOR = "#fb5a46";
const GUEST_COLOR = "#1c1712";
const EMPTY_COLOR = "#fbf7f1";

// Plateau Puissance 4 — voir hooks/use-connect-duo-session.ts. Le plateau,
// le tour et la victoire/l'égalité sont toujours dérivés du log de coups,
// jamais un état séparé à maintenir ici.
export function ConnectDuoBoard({ session, isInitiator }: ConnectDuoBoardProps) {
  const t = useTranslations("connectDuoRound");
  const board = buildBoard(session.moves);
  const myDisc: Disc = isInitiator ? "host" : "guest";
  const winningCells = new Set((session.winner?.cells ?? []).map(([row, col]) => `${row}-${col}`));

  return (
    <div className="flex flex-1 flex-col gap-6">
      {session.phase === "playing" && (
        <p className="text-center text-sm text-white/60">{session.isMyTurn ? t("yourTurn") : t("partnerTurn")}</p>
      )}

      <div className="mx-auto grid grid-cols-7 gap-1.5 rounded-2xl bg-[#0d0b0f] p-3">
        {board.map((row, rowIndex) =>
          row.map((disc, columnIndex) => {
            const isWinningCell = winningCells.has(`${rowIndex}-${columnIndex}`);
            return (
              <button
                key={`${rowIndex}-${columnIndex}`}
                data-connectduo-cell={`${rowIndex}-${columnIndex}`}
                onClick={() => session.dropDisc(columnIndex)}
                disabled={session.phase !== "playing" || !session.isMyTurn || isColumnFull(session.moves, columnIndex)}
                className="flex size-9 items-center justify-center sm:size-11"
              >
                <span
                  className={`block size-full rounded-full transition ${isWinningCell ? "ring-2 ring-white" : ""}`}
                  style={{ backgroundColor: disc === "host" ? HOST_COLOR : disc === "guest" ? GUEST_COLOR : EMPTY_COLOR }}
                />
              </button>
            );
          }),
        )}
      </div>

      {session.phase === "ended" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-heading text-xl font-bold text-white">
            {session.winner ? (session.winner.disc === myDisc ? t("youWon") : t("partnerWon")) : t("draw")}
          </p>
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
