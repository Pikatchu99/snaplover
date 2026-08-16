// Logique pure du Puissance 4 — tout dérivé du log de coups (`moves`),
// jamais d'état mutable séparé (grille, hauteurs de colonne) qui pourrait
// dériver de la source de vérité. Voir hooks/use-connect-duo-session.ts.
export const COLUMNS = 7;
export const ROWS = 6;

export type Disc = "host" | "guest";

export interface ConnectDuoMove {
  column: number;
}

// Le coup d'index pair est toujours celui de l'hôte, impair celui de
// l'invité·e — même principe que `drawerIsInitiatorForRound` côté Doodle
// Duel, mais par coup plutôt que par manche.
export function discForIndex(index: number): Disc {
  return index % 2 === 0 ? "host" : "guest";
}

export function columnHeight(moves: ConnectDuoMove[], column: number): number {
  return moves.filter((move) => move.column === column).length;
}

export function isColumnFull(moves: ConnectDuoMove[], column: number): boolean {
  return columnHeight(moves, column) >= ROWS;
}

export function isBoardFull(moves: ConnectDuoMove[]): boolean {
  return moves.length >= COLUMNS * ROWS;
}

// Reconstruit la grille (disque ou null par cellule) à partir du log de
// coups — la gravité fait tomber chaque jeton à la ligne la plus basse
// libre de sa colonne au moment du coup.
export function buildBoard(moves: ConnectDuoMove[]): (Disc | null)[][] {
  const board: (Disc | null)[][] = Array.from({ length: ROWS }, () => Array<Disc | null>(COLUMNS).fill(null));
  const heights = Array(COLUMNS).fill(0);
  moves.forEach((move, index) => {
    const row = ROWS - 1 - heights[move.column];
    if (row >= 0) board[row][move.column] = discForIndex(index);
    heights[move.column] += 1;
  });
  return board;
}

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export interface ConnectDuoWinner {
  disc: Disc;
  cells: [number, number][];
}

// Cherche un alignement de 4 dans les 4 directions à partir de chaque
// cellule — recalculé à chaque coup à partir de la grille dérivée, jamais
// mis en cache séparément (voir CLAUDE.md "Connect Duo" — une seule source
// de vérité).
export function checkWinner(moves: ConnectDuoMove[]): ConnectDuoWinner | null {
  const board = buildBoard(moves);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const disc = board[row][col];
      if (!disc) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const cells: [number, number][] = [[row, col]];
        for (let step = 1; step < 4; step++) {
          const r = row + dr * step;
          const c = col + dc * step;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS || board[r][c] !== disc) break;
          cells.push([r, c]);
        }
        if (cells.length === 4) return { disc, cells };
      }
    }
  }
  return null;
}
