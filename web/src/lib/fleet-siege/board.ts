import { config } from "@/lib/config";
import type { FleetSiegeCell, ShipPlacement } from "@/types/fleet-siege";

export const GRID_SIZE = config.fleetSiege.gridSize;
export const SHIP_SIZES = config.fleetSiege.shipSizes;

export function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function shipCells(ship: ShipPlacement): FleetSiegeCell[] {
  return Array.from({ length: ship.length }, (_, index) =>
    ship.orientation === "horizontal" ? { row: ship.row, col: ship.col + index } : { row: ship.row + index, col: ship.col },
  );
}

function cellToShipId(ships: ShipPlacement[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const ship of ships) {
    for (const cell of shipCells(ship)) map.set(cellKey(cell.row, cell.col), ship.id);
  }
  return map;
}

export interface FireOutcome {
  result: "hit" | "miss";
  sunkShip?: { id: string; cells: FleetSiegeCell[] };
  gameOver: boolean;
}

// Calculée par le·la propriétaire de la flotte à partir de SON PROPRE
// plateau — jamais transmise tant que la partie est en cours (voir
// CLAUDE.md "Fleet Siege" : extension spatiale du principe déjà établi par
// Word Sonar, où le·la propriétaire du mot secret calcule localement la
// réponse). `hitsSoFar` : cellules déjà touchées sur CE plateau avant ce
// tir, pour détecter un coulage sans garder d'état de coque séparé par
// navire — tout est toujours redérivé de la flotte + du log de touches.
export function computeFireOutcome(ships: ShipPlacement[], hitsSoFar: ReadonlySet<string>, row: number, col: number): FireOutcome {
  const shipId = cellToShipId(ships).get(cellKey(row, col));
  if (!shipId) return { result: "miss", gameOver: false };

  const nextHits = new Set(hitsSoFar);
  nextHits.add(cellKey(row, col));

  const ship = ships.find((candidate) => candidate.id === shipId)!;
  const cells = shipCells(ship);
  const sunk = cells.every((cell) => nextHits.has(cellKey(cell.row, cell.col)));
  const gameOver = ships.every((candidate) => shipCells(candidate).every((cell) => nextHits.has(cellKey(cell.row, cell.col))));

  return { result: "hit", sunkShip: sunk ? { id: ship.id, cells } : undefined, gameOver };
}
