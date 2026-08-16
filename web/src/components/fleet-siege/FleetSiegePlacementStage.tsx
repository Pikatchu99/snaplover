"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCw, Shuffle } from "lucide-react";
import { cellKey, GRID_SIZE, shipCells, SHIP_SIZES } from "@/lib/fleet-siege/board";
import { shipIdForLength } from "@/lib/fleet-siege/placement";
import type { Orientation } from "@/types/fleet-siege";
import type { UseFleetSiegeSessionReturn } from "@/hooks/use-fleet-siege-session";

interface FleetSiegePlacementStageProps {
  session: UseFleetSiegeSessionReturn;
}

// Phase de placement — privée, purement client (voir CLAUDE.md "Fleet
// Siege" : rien à cross-vérifier, le partenaire ne voit jamais la flotte
// avant la fin de partie). Tap une taille dans le vivier, tap une case pour
// poser (la case tapée devient l'origine, le navire s'étend à droite/en bas
// selon l'orientation courante) ; tap un navire déjà posé pour le reprendre.
// Aucun retour d'erreur visuel sur une pose invalide (hors-limite,
// chevauchement) : silencieusement ignorée, même convention que Connect Duo
// pour un coup illégal — l'utilisateur essaie juste une autre case.
export function FleetSiegePlacementStage({ session }: FleetSiegePlacementStageProps) {
  const t = useTranslations("fleetSiegePlacement");
  const [selectedLength, setSelectedLength] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");

  const placedLengths = new Set(session.myShips.map((ship) => ship.length));
  const shipCellOwner = new Map<string, number>();
  for (const ship of session.myShips) {
    for (const cell of shipCells(ship)) shipCellOwner.set(cellKey(cell.row, cell.col), ship.length);
  }
  const fleetComplete = session.myShips.length === SHIP_SIZES.length;

  function handleCellClick(row: number, col: number) {
    const key = cellKey(row, col);
    if (shipCellOwner.has(key)) {
      session.removeShipAt(row, col);
      return;
    }
    if (selectedLength === null) return;
    session.placeShip({ id: shipIdForLength(selectedLength), length: selectedLength, row, col, orientation });
    setSelectedLength(null);
  }

  if (session.myReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-white/60">{session.peerReady ? t("bothReady") : t("waitingForPartnerFleet")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-white">{t("title")}</h2>
        <button
          onClick={() => setOrientation((prev) => (prev === "horizontal" ? "vertical" : "horizontal"))}
          className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
        >
          <RotateCw className="size-3.5" />
          {orientation === "horizontal" ? t("orientationHorizontal") : t("orientationVertical")}
        </button>
      </div>

      <div className="mx-auto grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
        {Array.from({ length: GRID_SIZE }, (_, row) =>
          Array.from({ length: GRID_SIZE }, (_, col) => {
            const key = cellKey(row, col);
            const hasShip = shipCellOwner.has(key);
            return (
              <button
                key={key}
                data-fleetsiege-placement-cell={key}
                onClick={() => handleCellClick(row, col)}
                className="size-8 rounded-md transition sm:size-9"
                style={{ backgroundColor: hasShip ? "#fb5a46" : "#1c1a20" }}
              />
            );
          }),
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {SHIP_SIZES.map((length) => {
          const placed = placedLengths.has(length);
          return (
            <button
              key={length}
              data-fleetsiege-ship-size={length}
              onClick={() => !placed && setSelectedLength(length)}
              disabled={placed}
              className={`flex items-center gap-1 rounded-xl border px-3 py-2 transition ${
                placed
                  ? "border-white/10 opacity-30"
                  : selectedLength === length
                    ? "border-[#fb5a46] bg-[#fb5a46]/10"
                    : "border-white/20 hover:bg-white/10"
              }`}
            >
              {Array.from({ length }, (_, index) => (
                <span key={index} className="size-2.5 rounded-sm bg-[#fb5a46]" />
              ))}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={session.randomizeFleet}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <Shuffle className="size-4" />
          {t("randomize")}
        </button>
        <button
          onClick={session.confirmFleet}
          disabled={!fleetComplete}
          className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:from-white/15 disabled:to-white/15 disabled:text-white/50"
        >
          {t("confirm")}
        </button>
      </div>
    </div>
  );
}
