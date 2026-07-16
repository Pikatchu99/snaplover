import type { FilterId, FrameDefinition, StripStyle } from "@/types/frame";
import { FILTER_CSS } from "@/lib/capture/filters";
import { config } from "@/lib/config";
import { fr } from "@/i18n/messages";

export interface StripCell {
  /** Moitié gauche = hôte (initiator). */
  left: string;
  /** Moitié droite = invité (peer). */
  right: string;
}

export interface ComposeOptions {
  frame: FrameDefinition;
  filter: FilterId;
  /** Strip vertical (1 case par ligne) ou grille (2 cases par ligne). Défaut : vertical. */
  style?: StripStyle;
  /** Date affichée dans le footer (par défaut : maintenant). */
  date?: Date;
}

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
// hôte à gauche / invité à droite, marges et footer "SNAPROOM · DATE · À DEUX"
// habillés par le cadre choisi. Voir SNAPROOM-SPEC.md §10, §13.
export async function composeStrip(cells: StripCell[], options: ComposeOptions): Promise<string> {
  const { frame, filter, style = "vertical", date = new Date() } = options;
  const { cellWidth, cellHeight, columns } = config.strip.layout[style];
  const { gap, margin, footerHeight } = config.strip;

  const loadedCells = await Promise.all(
    cells.map(async (cell) => ({
      left: await loadImage(cell.left),
      right: await loadImage(cell.right),
    })),
  );

  const rows = Math.ceil(loadedCells.length / columns);
  const poseWidth = cellWidth * 2 + gap;

  const canvas = document.createElement("canvas");
  canvas.width = margin * 2 + poseWidth * columns + gap * (columns - 1);
  canvas.height = margin + (cellHeight + gap) * rows - gap + footerHeight + margin;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = frame.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.filter = FILTER_CSS[filter];
  loadedCells.forEach(({ left, right }, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * (poseWidth + gap);
    const y = margin + row * (cellHeight + gap);
    drawCover(ctx, left, x, y, cellWidth, cellHeight);
    drawCover(ctx, right, x + cellWidth + gap, y, cellWidth, cellHeight);
  });
  ctx.filter = "none";

  ctx.fillStyle = frame.footerTextColor;
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const footerY = canvas.height - margin - footerHeight / 2;
  ctx.fillText(fr.strip.footer(formatFooterDate(date)), canvas.width / 2, footerY);

  return canvas.toDataURL("image/png");
}
