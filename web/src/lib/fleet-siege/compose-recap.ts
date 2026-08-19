import { GRID_SIZE } from "@/lib/fleet-siege/board";
import type { FleetSiegeCell } from "@/types/fleet-siege";

// Layout fixe (pas de config.ts : purement visuel) — snapshot des deux
// plateaux révélés côte à côte, façon carte de résultat Wordle, composé À LA
// DEMANDE (au clic télécharger/partager, voir FleetSiegeBoards.tsx) une fois
// la partie terminée — jamais en continu pendant la bataille.
const CELL = 26;
const GRID_GAP_COLS = 60;
const MARGIN = 32;
const HEADER_HEIGHT = 70;
const LABEL_HEIGHT = 28;
const FOOTER_HEIGHT = 50;
const GRID_RADIUS = 12;

const WATER_COLOR = "#1c1a20";
const SHIP_COLOR = "#fb5a46";
const HOST_LABEL_COLOR = "#8c8378";

interface ComposeRecapOptions {
  outcomeText: string;
  myLabel: string;
  peerLabel: string;
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

function drawGrid(ctx: CanvasRenderingContext2D, left: number, top: number, cells: FleetSiegeCell[]) {
  const size = GRID_SIZE * CELL;
  ctx.fillStyle = "#0d0b0f";
  roundRectPath(ctx, left, top, size, size, GRID_RADIUS);
  ctx.fill();

  const shipCellKeys = new Set(cells.map((cell) => `${cell.row}-${cell.col}`));
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const isShip = shipCellKeys.has(`${row}-${col}`);
      ctx.fillStyle = isShip ? SHIP_COLOR : WATER_COLOR;
      const x = left + col * CELL + 1.5;
      const y = top + row * CELL + 1.5;
      ctx.fillRect(x, y, CELL - 3, CELL - 3);
    }
  }
}

// Composite la carte récap Fleet Siege : les deux flottes révélées côte à
// côte (voir CLAUDE.md "Fleet Siege" — le seul moment où un plateau complet
// est jamais montré), résultat en en-tête, footer de marque.
export async function composeFleetSiegeRecap(myCells: FleetSiegeCell[], peerCells: FleetSiegeCell[], options: ComposeRecapOptions): Promise<string> {
  const gridSizePx = GRID_SIZE * CELL;
  const canvas = document.createElement("canvas");
  canvas.width = MARGIN * 2 + gridSizePx * 2 + GRID_GAP_COLS;
  canvas.height = HEADER_HEIGHT + LABEL_HEIGHT + gridSizePx + FOOTER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#1c1712";
  ctx.font = "800 24px system-ui, sans-serif";
  ctx.fillText(options.outcomeText, canvas.width / 2, 44);

  const leftGridX = MARGIN;
  const rightGridX = MARGIN + gridSizePx + GRID_GAP_COLS;
  const gridTop = HEADER_HEIGHT + LABEL_HEIGHT;

  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillStyle = HOST_LABEL_COLOR;
  ctx.fillText(options.myLabel, leftGridX + gridSizePx / 2, HEADER_HEIGHT + LABEL_HEIGHT - 8);
  ctx.fillText(options.peerLabel, rightGridX + gridSizePx / 2, HEADER_HEIGHT + LABEL_HEIGHT - 8);

  drawGrid(ctx, leftGridX, gridTop, myCells);
  drawGrid(ctx, rightGridX, gridTop, peerCells);

  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
