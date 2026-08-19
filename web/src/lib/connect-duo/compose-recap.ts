import { buildBoard, COLUMNS, ROWS, type ConnectDuoMove, type ConnectDuoWinner } from "@/lib/connect-duo/board";

// Layout fixe (pas de config.ts : purement visuel, jamais retouché en dehors
// d'une passe design) — snapshot du plateau final façon carte de résultat
// Wordle, composé À LA DEMANDE (au clic sur télécharger/partager, voir
// ConnectDuoBoard.tsx), jamais en continu — recomposer une image à chaque
// coup serait coûteux et inutile tant que personne ne partage.
const CELL = 44;
const GAP = 6;
const MARGIN = 24;
const HEADER_HEIGHT = 70;
const FOOTER_HEIGHT = 50;
const BOARD_PADDING = 12;
const BOARD_RADIUS = 16;

// Mêmes couleurs que ConnectDuoBoard.tsx — jamais de violet ici (réservé au
// chemin "rejoindre").
const HOST_COLOR = "#fb5a46";
const GUEST_COLOR = "#fbf7f1";
const EMPTY_COLOR = "#1c1a20";
const WINNING_RING_COLOR = "#1c1712";

interface ComposeRecapOptions {
  outcomeText: string;
  footerText: string;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Composite la carte récap Connect Duo : le plateau final (avec l'alignement
// gagnant surligné s'il y en a un), résultat en en-tête, footer de marque.
export async function composeConnectDuoRecap(
  moves: ConnectDuoMove[],
  winner: ConnectDuoWinner | null,
  options: ComposeRecapOptions,
): Promise<string> {
  const board = buildBoard(moves);
  const boardWidth = COLUMNS * CELL + (COLUMNS - 1) * GAP;
  const boardHeight = ROWS * CELL + (ROWS - 1) * GAP;

  const canvas = document.createElement("canvas");
  canvas.width = boardWidth + MARGIN * 2;
  canvas.height = HEADER_HEIGHT + boardHeight + BOARD_PADDING * 2 + FOOTER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#1c1712";
  ctx.font = "800 24px system-ui, sans-serif";
  ctx.fillText(options.outcomeText, canvas.width / 2, 44);

  const boardLeft = MARGIN;
  const boardTop = HEADER_HEIGHT;
  ctx.fillStyle = "#0d0b0f";
  roundRectPath(ctx, boardLeft - BOARD_PADDING, boardTop - BOARD_PADDING, boardWidth + BOARD_PADDING * 2, boardHeight + BOARD_PADDING * 2, BOARD_RADIUS);
  ctx.fill();

  const winningCells = new Set((winner?.cells ?? []).map(([row, col]) => `${row}-${col}`));
  board.forEach((row, rowIndex) => {
    row.forEach((disc, columnIndex) => {
      const x = boardLeft + columnIndex * (CELL + GAP) + CELL / 2;
      const y = boardTop + rowIndex * (CELL + GAP) + CELL / 2;
      ctx.beginPath();
      ctx.arc(x, y, CELL / 2, 0, Math.PI * 2);
      ctx.fillStyle = disc === "host" ? HOST_COLOR : disc === "guest" ? GUEST_COLOR : EMPTY_COLOR;
      ctx.fill();
      if (winningCells.has(`${rowIndex}-${columnIndex}`)) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = WINNING_RING_COLOR;
        ctx.stroke();
      }
    });
  });

  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
