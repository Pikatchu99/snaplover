import type { FilterId, FrameDefinition } from "@/types/frame";
import { FILTER_CSS } from "@/lib/capture/filters";

export interface StripCell {
  /** Moitié gauche = hôte (initiator). */
  left: string;
  /** Moitié droite = invité (peer). */
  right: string;
}

export interface ComposeOptions {
  frame: FrameDefinition;
  filter: FilterId;
  /** Date affichée dans le footer (par défaut : maintenant). */
  date?: Date;
}

const CELL_WIDTH = 450;
const CELL_HEIGHT = 600;
const GAP = 12;
const MARGIN = 30;
const FOOTER_HEIGHT = 54;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Échec de décodage image (${src.length} caractères, début: ${src.slice(0, 40)})`));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imageRatio = img.width / img.height;
  const targetRatio = w / h;
  let sw: number, sh: number, sx: number, sy: number;

  if (imageRatio > targetRatio) {
    sh = img.height;
    sw = sh * targetRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / targetRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function formatFooterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

// Compose la bande complète, look rétro-cabine : chaque case = une pose,
// hôte à gauche / invité à droite, cases empilées verticalement, marges et
// footer "SNAPROOM · DATE · À DEUX" habillés par le cadre choisi.
// Voir SNAPROOM-SPEC.md §10, §13.
export async function composeStrip(cells: StripCell[], options: ComposeOptions): Promise<string> {
  const { frame, filter, date = new Date() } = options;

  const loadedCells = await Promise.all(
    cells.map(async (cell) => ({
      left: await loadImage(cell.left),
      right: await loadImage(cell.right),
    })),
  );

  const canvas = document.createElement("canvas");
  canvas.width = CELL_WIDTH * 2 + GAP + MARGIN * 2;
  canvas.height = MARGIN + (CELL_HEIGHT + GAP) * loadedCells.length - GAP + FOOTER_HEIGHT + MARGIN;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = frame.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.filter = FILTER_CSS[filter];
  loadedCells.forEach(({ left, right }, index) => {
    const y = MARGIN + index * (CELL_HEIGHT + GAP);
    drawCover(ctx, left, MARGIN, y, CELL_WIDTH, CELL_HEIGHT);
    drawCover(ctx, right, MARGIN + CELL_WIDTH + GAP, y, CELL_WIDTH, CELL_HEIGHT);
  });
  ctx.filter = "none";

  ctx.fillStyle = frame.footerTextColor;
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const footerY = canvas.height - MARGIN - FOOTER_HEIGHT / 2;
  ctx.fillText(`SNAPROOM · ${formatFooterDate(date)} · À DEUX`, canvas.width / 2, footerY);

  return canvas.toDataURL("image/png");
}
