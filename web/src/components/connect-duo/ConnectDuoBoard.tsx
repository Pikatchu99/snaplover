"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { buildBoard, isColumnFull, type Disc } from "@/lib/connect-duo/board";
import type { UseConnectDuoSessionReturn } from "@/hooks/use-connect-duo-session";

interface ConnectDuoBoardProps {
  session: UseConnectDuoSessionReturn;
  isInitiator: boolean;
}

// Jamais de violet ici (réservé au chemin "rejoindre", voir CLAUDE.md) — le
// disque de l'hôte reprend le corail déjà utilisé comme couleur d'action
// primaire partout ailleurs dans l'app. Celui de l'invité·e était à l'encre
// sombre (#1c1712) dans un premier jet : invisible sur le fond déjà sombre
// de l'écran de jeu — retour utilisateur réel après test. Passé au papier
// clair (déjà le token --paper de l'app) pour un vrai contraste ; la case
// vide n'est plus ce même papier clair (elle se lisait comme "déjà remplie
// d'un jeton blanc") mais un simple trou creusé dans le fond du plateau.
const HOST_COLOR = "#fb5a46";
const GUEST_COLOR = "#fbf7f1";
const EMPTY_COLOR = "#1c1a20";
// Anneau de victoire sombre : lisible aussi bien sur un jeton corail que
// sur un jeton papier clair, contrairement à un anneau blanc (invisible
// sur un jeton déjà quasi-blanc).
const WINNING_RING_COLOR = "#1c1712";

// Plateau Puissance 4 — voir hooks/use-connect-duo-session.ts. Le plateau,
// le tour et la victoire/l'égalité sont toujours dérivés du log de coups,
// jamais un état séparé à maintenir ici. Chaque jeton n'anime sa chute
// qu'une seule fois, au moment exact où il apparaît (une case vide ne
// rendait rien de `motion`, le jeton ne monte donc dans l'arbre React qu'à
// cet instant précis — Framer Motion ne rejoue `initial` qu'au montage,
// jamais les jetons déjà posés ne se re-animent sur les coups suivants).
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

      <div className="mx-auto grid grid-cols-7 gap-1.5 overflow-hidden rounded-2xl bg-[#0d0b0f] p-3">
        {board.map((row, rowIndex) =>
          row.map((disc, columnIndex) => {
            const isWinningCell = winningCells.has(`${rowIndex}-${columnIndex}`);
            return (
              <button
                key={`${rowIndex}-${columnIndex}`}
                data-connectduo-cell={`${rowIndex}-${columnIndex}`}
                onClick={() => session.dropDisc(columnIndex)}
                disabled={session.phase !== "playing" || !session.isMyTurn || isColumnFull(session.moves, columnIndex)}
                className="relative flex size-9 items-center justify-center sm:size-11"
              >
                {disc ? (
                  <motion.span
                    initial={{ y: -320 }}
                    animate={{ y: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    className="block size-full rounded-full"
                    style={{
                      backgroundColor: disc === "host" ? HOST_COLOR : GUEST_COLOR,
                      boxShadow: isWinningCell ? `0 0 0 2px ${WINNING_RING_COLOR}` : undefined,
                    }}
                  />
                ) : (
                  <span className="block size-full rounded-full" style={{ backgroundColor: EMPTY_COLOR }} />
                )}
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
