import type { CellValue, SubBoardResult, UtttMove, UtttSymbol } from "@/types/uttt";

// Logique pure d'Ultimate Tic-Tac-Toe — TOUT dérivé du log de coups partagé
// (`moves`), jamais d'état mutable séparé qui pourrait dériver (voir
// hooks/use-uttt-session.ts, même philosophie que lib/connect-duo/board.ts
// mais à deux niveaux : sous-plateau ET méta-plateau). UNE SEULE
// implémentation, importée à la fois côté envoi (gate local avant
// d'envoyer un coup) et côté réception (revalidation défensive) — jamais
// deux copies de la même règle qui pourraient silencieusement diverger
// (voir CLAUDE.md "Ultimate Tic-Tac-Toe").
const WIN_LINES: readonly [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function symbolForMoveIndex(index: number): UtttSymbol {
  return index % 2 === 0 ? "X" : "O";
}

function lineWinner(cells: readonly CellValue[]): UtttSymbol | null {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) return cells[a];
  }
  return null;
}

// Reconstruit les 9 sous-plateaux (9 cellules chacun) à partir du log de
// coups — le symbole de chaque coup se déduit de sa position dans le log
// (pair = X/hôte, impair = O/invité·e), jamais transmis séparément.
export function buildSubBoardCells(moves: UtttMove[]): CellValue[][] {
  const boards: CellValue[][] = Array.from({ length: 9 }, () => Array<CellValue>(9).fill(null));
  moves.forEach((move, index) => {
    boards[move.boardIndex][move.cellIndex] = symbolForMoveIndex(index);
  });
  return boards;
}

// Un sous-plateau, une fois décidé (gagné ou nul), est verrouillé pour
// toujours — aucun coup ne peut plus jamais y être joué, quelle que soit la
// contrainte de plateau actif (voir isLegalMove).
export function checkSubBoardResult(cells: CellValue[]): SubBoardResult {
  const winner = lineWinner(cells);
  if (winner === "X") return "won-x";
  if (winner === "O") return "won-o";
  if (cells.every((cell) => cell !== null)) return "draw";
  return "open";
}

export function buildSubBoardResults(moves: UtttMove[]): SubBoardResult[] {
  return buildSubBoardCells(moves).map(checkSubBoardResult);
}

// Le méta-plateau se lit avec les MÊMES 8 lignes, en traitant "won-x"/
// "won-o" comme des cellules X/O revendiquées et "open"/"draw" comme non
// revendiquées. `null` = partie toujours en cours.
export function checkMetaResult(subResults: SubBoardResult[]): UtttSymbol | "draw" | null {
  const claimed: CellValue[] = subResults.map((result) => (result === "won-x" ? "X" : result === "won-o" ? "O" : null));
  const winner = lineWinner(claimed);
  if (winner) return winner;
  if (subResults.every((result) => result !== "open")) return "draw";
  return null;
}

// Le plateau que le PROCHAIN coup doit respecter : aucune contrainte au
// tout premier coup (`null` = n'importe quel plateau ouvert). Ensuite, la
// position jouée dans son sous-plateau (cellIndex) force le sous-plateau
// correspondant pour le coup suivant — SAUF si ce sous-plateau cible est
// déjà décidé (gagné OU nul, pas seulement gagné — piège identifié dans la
// spec), auquel cas la contrainte se lève entièrement pour ce tour.
export function activeBoard(moves: UtttMove[], subResults: SubBoardResult[]): number | null {
  if (moves.length === 0) return null;
  const lastCellIndex = moves[moves.length - 1].cellIndex;
  return subResults[lastCellIndex] === "open" ? lastCellIndex : null;
}

// Porte de légalité UNIQUE — appelée à la fois avant l'envoi (mon propre
// coup) et à la réception (revalidation défensive du coup de l'autre,
// jamais une histoire de confiance : catch un bug client, pas une
// triche — voir CLAUDE.md).
export function isLegalMove(moves: UtttMove[], boardIndex: number, cellIndex: number): boolean {
  const subCells = buildSubBoardCells(moves);
  const subResults = subCells.map(checkSubBoardResult);
  if (checkMetaResult(subResults) !== null) return false;
  if (subResults[boardIndex] !== "open") return false;
  if (subCells[boardIndex][cellIndex] !== null) return false;
  const active = activeBoard(moves, subResults);
  return active === null || active === boardIndex;
}
