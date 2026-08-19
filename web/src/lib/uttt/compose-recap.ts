import { buildSubBoardCells, buildSubBoardResults } from "@/lib/uttt/win-check";
import type { UtttMove } from "@/types/uttt";

// Layout fixe (pas de config.ts : purement visuel) — contrairement à Doodle
// Duel/Word Sonar/Edge Letters/Duo Quiz (N manches, un tableau par ligne),
// Ultimate Tic-Tac-Toe est UNE SEULE partie continue (voir CLAUDE.md) : le
// récap est un snapshot unique du méta-plateau final, pas un tableau de
// lignes. Composé À LA DEMANDE (au clic télécharger/partager), jamais en
// continu.
const META_SIZE = 3;
const SUB_SIZE = 3;
const CELL = 26;
const CELL_GAP = 2;
const SUB_GAP = 10;
const MARGIN = 32;
const HEADER_HEIGHT = 70;
const FOOTER_HEIGHT = 50;
const SUB_RADIUS = 10;

const X_COLOR = "#fb5a46";
const O_COLOR = "#1c1712";
const OPEN_CELL_COLOR = "#ece4d8";
const DECIDED_BG_COLOR = "#fbf7f1";
const SUB_BORDER_COLOR = "#ece4d8";

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

// Composite la carte récap Ultimate Tic-Tac-Toe : le méta-plateau final —
// un sous-plateau décidé s'affiche comme un grand X/O/trait (façon partie
// physique), un sous-plateau resté ouvert (abandonné après une victoire
// méta anticipée, voir CLAUDE.md) affiche ses marques individuelles —
// résultat en en-tête, footer de marque.
export async function composeUtttRecap(moves: UtttMove[], options: ComposeRecapOptions): Promise<string> {
  const subCells = buildSubBoardCells(moves);
  const subResults = buildSubBoardResults(moves);

  const subBoardSize = SUB_SIZE * CELL + (SUB_SIZE - 1) * CELL_GAP;
  const metaSize = META_SIZE * subBoardSize + (META_SIZE - 1) * SUB_GAP;

  const canvas = document.createElement("canvas");
  canvas.width = metaSize + MARGIN * 2;
  canvas.height = HEADER_HEIGHT + metaSize + FOOTER_HEIGHT;

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

  for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
    const subRow = Math.floor(boardIndex / META_SIZE);
    const subCol = boardIndex % META_SIZE;
    const subLeft = boardLeft + subCol * (subBoardSize + SUB_GAP);
    const subTop = boardTop + subRow * (subBoardSize + SUB_GAP);
    const result = subResults[boardIndex];

    ctx.fillStyle = DECIDED_BG_COLOR;
    roundRectPath(ctx, subLeft, subTop, subBoardSize, subBoardSize, SUB_RADIUS);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = SUB_BORDER_COLOR;
    ctx.stroke();

    if (result === "won-x" || result === "won-o") {
      ctx.strokeStyle = result === "won-x" ? X_COLOR : O_COLOR;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      const pad = subBoardSize * 0.18;
      if (result === "won-x") {
        ctx.beginPath();
        ctx.moveTo(subLeft + pad, subTop + pad);
        ctx.lineTo(subLeft + subBoardSize - pad, subTop + subBoardSize - pad);
        ctx.moveTo(subLeft + subBoardSize - pad, subTop + pad);
        ctx.lineTo(subLeft + pad, subTop + subBoardSize - pad);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(subLeft + subBoardSize / 2, subTop + subBoardSize / 2, subBoardSize / 2 - pad, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (result === "draw") {
      ctx.strokeStyle = "#8c8378";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(subLeft + subBoardSize * 0.2, subTop + subBoardSize / 2);
      ctx.lineTo(subLeft + subBoardSize * 0.8, subTop + subBoardSize / 2);
      ctx.stroke();
    } else {
      const cells = subCells[boardIndex];
      cells.forEach((cell, cellIndex) => {
        if (!cell) return;
        const cellRow = Math.floor(cellIndex / SUB_SIZE);
        const cellCol = cellIndex % SUB_SIZE;
        const cx = subLeft + cellCol * (CELL + CELL_GAP) + CELL / 2;
        const cy = subTop + cellRow * (CELL + CELL_GAP) + CELL / 2;
        ctx.strokeStyle = cell === "X" ? X_COLOR : O_COLOR;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        const cellPad = CELL * 0.22;
        if (cell === "X") {
          ctx.beginPath();
          ctx.moveTo(cx - CELL / 2 + cellPad, cy - CELL / 2 + cellPad);
          ctx.lineTo(cx + CELL / 2 - cellPad, cy + CELL / 2 - cellPad);
          ctx.moveTo(cx + CELL / 2 - cellPad, cy - CELL / 2 + cellPad);
          ctx.lineTo(cx - CELL / 2 + cellPad, cy + CELL / 2 - cellPad);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, CELL / 2 - cellPad, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      // Cases vides d'un sous-plateau encore ouvert : simple point discret.
      cells.forEach((cell, cellIndex) => {
        if (cell) return;
        const cellRow = Math.floor(cellIndex / SUB_SIZE);
        const cellCol = cellIndex % SUB_SIZE;
        const cx = subLeft + cellCol * (CELL + CELL_GAP) + CELL / 2;
        const cy = subTop + cellRow * (CELL + CELL_GAP) + CELL / 2;
        ctx.fillStyle = OPEN_CELL_COLOR;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
