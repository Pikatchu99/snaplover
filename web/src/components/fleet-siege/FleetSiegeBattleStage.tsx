"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Share2, X } from "lucide-react";
import { cellKey, GRID_SIZE, shipCells } from "@/lib/fleet-siege/board";
import { composeFleetSiegeRecap } from "@/lib/fleet-siege/compose-recap";
import { shareOrDownload } from "@/lib/share-or-download";
import type { UseFleetSiegeSessionReturn } from "@/hooks/use-fleet-siege-session";

interface FleetSiegeBattleStageProps {
  session: UseFleetSiegeSessionReturn;
}

const SHIP_COLOR = "#fb5a46";
const WATER_COLOR = "#1c1a20";
const SUNK_REVEAL_COLOR = "#3a3f4b";

// Bataille + révélation — voir hooks/use-fleet-siege-session.ts. Deux
// grilles : "Ma flotte" (mes navires toujours visibles, marqueurs touché/
// raté de l'adversaire superposés) et "Eaux ennemies" (brouillard de
// guerre : seules les cases déjà visées affichent un marqueur, un navire
// coulé révèle uniquement SES cellules, jamais le reste du plateau). Pas
// d'écran de récap séparé (même choix que Connect Duo, voir CLAUDE.md) :
// "Rejouer" repart directement en placement sur la même connexion, la
// caméra ne s'arrête donc jamais ici.
export function FleetSiegeBattleStage({ session }: FleetSiegeBattleStageProps) {
  const t = useTranslations("fleetSiegeBattle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const myShipCellSet = new Set(session.myShips.flatMap((ship) => shipCells(ship).map((cell) => cellKey(cell.row, cell.col))));
  const peerShotByCell = new Map(session.peerShots.map((shot) => [cellKey(shot.row, shot.col), shot.result]));
  const myShotByCell = new Map(session.myShots.map((shot) => [cellKey(shot.row, shot.col), shot]));
  const revealedSunkCells = new Set(
    session.myShots.filter((shot) => shot.sunkShip).flatMap((shot) => shot.sunkShip!.cells.map((cell) => cellKey(cell.row, cell.col))),
  );

  const iWon = session.winner === session.mySide;
  const outcomeText = iWon ? t("youWon") : t("partnerWon");

  useEffect(() => {
    if (session.phase !== "reveal" || !session.peerRevealedShips) return;
    let cancelled = false;
    const myCells = session.myShips.flatMap((ship) => shipCells(ship));
    const peerCells = session.peerRevealedShips.flatMap((ship) => ship.cells);
    composeFleetSiegeRecap(myCells, peerCells, {
      outcomeText,
      myLabel: t("you"),
      peerLabel: t("partner"),
      footerText: t("footerText"),
    }).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
      setImageUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase, session.peerRevealedShips]);

  async function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "snaplover-fleet-siege.png";
    a.click();
  }

  async function handleShare() {
    if (!imageUrl) return;
    await shareOrDownload(imageUrl, "snaplover-fleet-siege.png", t("shareText"));
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      {session.phase === "battle" && (
        <p className="text-center text-sm text-white/60">{session.isMyTurn ? t("yourTurn") : t("partnerTurn")}</p>
      )}

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{t("myFleet")}</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
            {Array.from({ length: GRID_SIZE }, (_, row) =>
              Array.from({ length: GRID_SIZE }, (_, col) => {
                const key = cellKey(row, col);
                const isShip = myShipCellSet.has(key);
                const shotResult = peerShotByCell.get(key);
                return (
                  <div
                    key={key}
                    className="flex size-7 items-center justify-center rounded-md sm:size-8"
                    style={{ backgroundColor: isShip ? SHIP_COLOR : WATER_COLOR }}
                  >
                    {shotResult === "hit" && <X className="size-4 text-[#1c1712]" />}
                    {shotResult === "miss" && <span className="size-1.5 rounded-full bg-white/60" />}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{t("targetWaters")}</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
            {Array.from({ length: GRID_SIZE }, (_, row) =>
              Array.from({ length: GRID_SIZE }, (_, col) => {
                const key = cellKey(row, col);
                const shot = myShotByCell.get(key);
                const sunkReveal = revealedSunkCells.has(key);
                const disabled = session.phase !== "battle" || !session.isMyTurn || Boolean(shot);
                return (
                  <button
                    key={key}
                    data-fleetsiege-target-cell={key}
                    onClick={() => session.fireAt(row, col)}
                    disabled={disabled}
                    className="flex size-7 items-center justify-center rounded-md sm:size-8"
                    style={{ backgroundColor: sunkReveal ? SUNK_REVEAL_COLOR : WATER_COLOR }}
                  >
                    {shot?.result === "hit" && <X className="size-4 text-[#fb5a46]" />}
                    {shot?.result === "miss" && <span className="size-1.5 rounded-full bg-white/60" />}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {session.phase === "reveal" && (
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
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
