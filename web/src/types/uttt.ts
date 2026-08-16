// Ultimate Tic-Tac-Toe : méta-plateau 3x3 de neuf sous-plateaux 3x3 — voir
// hooks/use-uttt-session.ts et lib/uttt/win-check.ts. Aucune BDD (comme le
// reste du MVP), aucune information cachée (voir CLAUDE.md "Ultimate
// Tic-Tac-Toe") : le plateau entier est public des deux côtés en
// permanence, tout est TOUJOURS dérivé du même log de coups partagé.

export type UtttSymbol = "X" | "O";

export type CellValue = UtttSymbol | null;

export type SubBoardResult = "open" | "won-x" | "won-o" | "draw";

export interface UtttMove {
  boardIndex: number;
  cellIndex: number;
}

export type UtttPhase = "lobby" | "playing";
