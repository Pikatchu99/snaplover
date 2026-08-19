import { config } from "@/lib/config";
import type { BingoCard, BingoLineRef } from "@/types/bingo";

// Les 5 lignes, 5 colonnes et 2 diagonales d'une carte 5x5 — UNE SEULE
// implémentation, importée des deux côtés (voir CLAUDE.md "Bingo") : la
// vérification d'une réclamation doit être identique et indépendante chez
// les deux joueur·euses, jamais une autorité unique qui "décide" qui a
// gagné.
const SIZE = config.bingo.cardSize;

interface BuiltLine extends BingoLineRef {
  cells: number[];
}

function buildLines(): BuiltLine[] {
  const lines: BuiltLine[] = [];
  for (let row = 0; row < SIZE; row++) {
    lines.push({ type: "row", index: row, cells: Array.from({ length: SIZE }, (_, col) => row * SIZE + col) });
  }
  for (let col = 0; col < SIZE; col++) {
    lines.push({ type: "col", index: col, cells: Array.from({ length: SIZE }, (_, row) => row * SIZE + col) });
  }
  lines.push({ type: "diag", index: 0, cells: Array.from({ length: SIZE }, (_, i) => i * SIZE + i) });
  lines.push({ type: "diag", index: 1, cells: Array.from({ length: SIZE }, (_, i) => i * SIZE + (SIZE - 1 - i)) });
  return lines;
}

const LINES = buildLines();

// La case gratuite (`null`) compte toujours comme satisfaite dans
// n'importe quelle ligne qui la contient.
function isLineComplete(card: BingoCard, marked: ReadonlySet<number>, line: BuiltLine): boolean {
  return line.cells.every((cellIndex) => {
    const value = card.numbers[cellIndex];
    return value === null || marked.has(value);
  });
}

export function findCompletedLines(card: BingoCard, marked: ReadonlySet<number>): BuiltLine[] {
  return LINES.filter((line) => isLineComplete(card, marked, line));
}

// Les numéros RÉELS d'une ligne (case gratuite exclue — elle n'a besoin
// d'aucune vérification) : c'est tout ce qu'une réclamation révèle, jamais
// le reste de la carte (voir types/bingo-realtime.ts).
export function lineNumbers(card: BingoCard, line: BingoLineRef): number[] {
  const built = LINES.find((candidate) => candidate.type === line.type && candidate.index === line.index);
  if (!built) return [];
  return built.cells.map((cellIndex) => card.numbers[cellIndex]).filter((value): value is number => value !== null);
}
