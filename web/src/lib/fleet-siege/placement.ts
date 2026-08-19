import { cellKey, GRID_SIZE, shipCells, SHIP_SIZES } from "@/lib/fleet-siege/board";
import type { Orientation, ShipPlacement } from "@/types/fleet-siege";

// Validation de placement — purement locale, jamais soumise à l'autre côté
// (voir CLAUDE.md "Fleet Siege" : rien à cross-vérifier puisque le
// partenaire ne voit jamais la flotte tant que la partie n'est pas finie).
// Pas de règle d'adjacence (les navires peuvent se toucher) : gardé simple,
// aucun contrôle croisé possible ni nécessaire ici.

export function isInBounds(ship: ShipPlacement): boolean {
  return shipCells(ship).every((cell) => cell.row >= 0 && cell.row < GRID_SIZE && cell.col >= 0 && cell.col < GRID_SIZE);
}

export function overlapsAny(ship: ShipPlacement, others: ShipPlacement[]): boolean {
  const ownCells = new Set(shipCells(ship).map((cell) => cellKey(cell.row, cell.col)));
  return others.some((other) => shipCells(other).some((cell) => ownCells.has(cellKey(cell.row, cell.col))));
}

export function canPlaceShip(ship: ShipPlacement, existing: ShipPlacement[]): boolean {
  return isInBounds(ship) && !overlapsAny(
    ship,
    existing.filter((other) => other.id !== ship.id),
  );
}

// Une taille de navire par ID (voir randomPlacement) — les tailles de
// config.fleetSiege.shipSizes sont toutes distinctes, donc "ship-<taille>"
// est un identifiant déjà unique par flotte sans compteur d'état séparé.
export function shipIdForLength(length: number): string {
  return `ship-${length}`;
}

export function isFleetComplete(ships: ShipPlacement[]): boolean {
  const placedLengths = ships.map((ship) => ship.length).toSorted((a, b) => a - b);
  const expectedLengths = [...SHIP_SIZES].toSorted((a, b) => a - b);
  return placedLengths.length === expectedLengths.length && placedLengths.every((length, index) => length === expectedLengths[index]);
}

export function isValidFleet(ships: ShipPlacement[]): boolean {
  return isFleetComplete(ships) && ships.every((ship) => canPlaceShip(ship, ships));
}

// "Randomize" — ne décide que MES propres données secrètes (voir CLAUDE.md :
// même nature que Word Sonar choisissant son mot en privé), aucun hasard
// partagé à synchroniser entre les deux côtés.
export function randomPlacement(): ShipPlacement[] {
  const ships: ShipPlacement[] = [];
  for (const length of SHIP_SIZES) {
    let attempts = 0;
    while (attempts < 200) {
      attempts++;
      const orientation: Orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
      const maxRow = orientation === "vertical" ? GRID_SIZE - length : GRID_SIZE - 1;
      const maxCol = orientation === "horizontal" ? GRID_SIZE - length : GRID_SIZE - 1;
      const candidate: ShipPlacement = {
        id: shipIdForLength(length),
        length,
        row: Math.floor(Math.random() * (maxRow + 1)),
        col: Math.floor(Math.random() * (maxCol + 1)),
        orientation,
      };
      if (canPlaceShip(candidate, ships)) {
        ships.push(candidate);
        break;
      }
    }
  }
  return ships;
}
