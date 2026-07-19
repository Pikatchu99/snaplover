import type { FilterId, FrameDefinition, StripStyle } from "@/types/frame";
import type { StickerDefinition } from "@/types/sticker";
import { FILTER_PIXEL_OPS } from "@/lib/capture/filters";
import { config } from "@/lib/config";

export interface StripCell {
  /** Moitié gauche = hôte (initiator), ou l'unique photo en challenge solo. */
  left: string;
  /** Moitié droite = invité (peer) — absent en challenge solo (une seule personne). */
  right?: string;
  /** Sticker à afficher au centre de la pose — uniquement en mode challenge. */
  sticker?: StickerDefinition;
}

export interface ComposeOptions {
  frame: FrameDefinition;
  filter: FilterId;
  /** Strip vertical (1 case par ligne) ou grille (2 cases par ligne). Défaut : vertical. */
  style?: StripStyle;
  /** Texte du footer déjà résolu (traduit + date déjà formatée) — voir
   * lib/capture/format-footer-date.ts. Cette fonction ne connaît pas la
   * locale courante, donc jamais de i18n ici, seulement du dessin. */
  footerText: string;
  /** "duo" (défaut) = 2 photos par pose (StripCell.right requis), "solo" = 1
   * seule (StripCell.left uniquement) — indépendant du mode challenge. */
  participants?: "duo" | "solo";
  /** Présent uniquement en mode challenge — active la colonne sticker centrale. */
  challenge?: { widthRatio: number };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Échec de décodage image (${src.length} caractères, début: ${src.slice(0, 40)})`));
    img.src = src;
  });
}

function clipRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
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

// Recadre l'image ("cover") sur un canvas hors-écran de la taille cible, puis
// applique le filtre pixel par pixel dessus avant de le reporter sur le
// canvas final — voir lib/capture/filters.ts pour pourquoi pas ctx.filter.
// Coins arrondis (config.strip.cellCornerRadius) : chaque photo se détache
// nettement du cadre plutôt que de s'y fondre en rectangle brut.
function drawCoverFiltered(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  filter: FilterId,
) {
  ctx.save();
  clipRoundRect(ctx, x, y, w, h, config.strip.cellCornerRadius);

  const op = FILTER_PIXEL_OPS[filter];
  if (!op) {
    drawCover(ctx, img, x, y, w, h);
    ctx.restore();
    return;
  }

  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) throw new Error("2D canvas context unavailable");

  drawCover(offCtx, img, 0, 0, w, h);
  const imageData = offCtx.getImageData(0, 0, w, h);
  op(imageData.data);
  offCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(offscreen, x, y);
  ctx.restore();
}

// Dessine un sticker (canvas carré, voir lib/stickers/sticker-registry.ts)
// centré dans une cellule portrait, avec un fond carte discret —
// contrairement aux photos capturées, un sticker n'est jamais recadré en
// "cover". Asynchrone : le sticker charge son image sourcée avant de dessiner.
async function paintStickerCell(
  ctx: CanvasRenderingContext2D,
  sticker: StickerDefinition,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y, w, h);

  const size = Math.min(w, h);
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) throw new Error("2D canvas context unavailable");
  await sticker.paint(offCtx, size);

  ctx.drawImage(offscreen, x + (w - size) / 2, y + (h - size) / 2, size, size);
}

// Compose la bande complète, look rétro-cabine : chaque case = une pose,
// hôte à gauche / invité à droite (+ sticker au centre en mode challenge),
// marges et footer habillés par le cadre choisi. Voir SNAPROOM-SPEC.md §10,
// §13, et docs/STICKER-CHALLENGES.md pour le mode challenge.
export async function composeStrip(cells: StripCell[], options: ComposeOptions): Promise<string> {
  const { frame, filter, style = "vertical", footerText, participants = "duo", challenge } = options;
  const { cellWidth, cellHeight, columns } = config.strip.layout[style];
  const { gap, margin, footerHeight } = config.strip;

  const isSolo = participants === "solo";

  const loadedCells = await Promise.all(
    cells.map(async (cell) => ({
      left: await loadImage(cell.left),
      right: cell.right ? await loadImage(cell.right) : undefined,
      sticker: cell.sticker,
    })),
  );

  const rows = Math.ceil(loadedCells.length / columns);
  const photoCount = isSolo ? 1 : 2;
  const stickerWidth = challenge ? cellWidth * challenge.widthRatio : 0;
  // Nombre d'espaces internes à la pose = (nb de slots - 1) : 1 photo seule
  // (solo classique) n'a besoin d'aucun gap, 2 photos (duo classique) en ont
  // un, +1 de plus si un sticker s'intercale (mode challenge).
  const slots = photoCount + (challenge ? 1 : 0);
  const poseWidth = cellWidth * photoCount + stickerWidth + gap * (slots - 1);

  const canvas = document.createElement("canvas");
  canvas.width = margin * 2 + poseWidth * columns + gap * (columns - 1);
  canvas.height = margin + (cellHeight + gap) * rows - gap + footerHeight + margin;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  // Frontière entre chaque colonne de poses (style grille uniquement) — voir
  // FrameCellLayout, utilisé par le cadre `film` pour ses perforations.
  const columnBoundaries = Array.from({ length: columns - 1 }, (_, i) => margin + (i + 1) * poseWidth + i * gap + gap / 2);
  frame.paint(ctx, canvas.width, canvas.height, margin, { columnBoundaries });

  // for...of (pas .forEach) : paintStickerCell est asynchrone, il faut
  // attendre chaque sticker avant de finaliser le canvas (toDataURL) plus bas.
  for (const [index, { left, right, sticker }] of loadedCells.entries()) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * (poseWidth + gap);
    const y = margin + row * (cellHeight + gap);
    drawCoverFiltered(ctx, left, x, y, cellWidth, cellHeight, filter);

    if (challenge && sticker) {
      const stickerX = x + cellWidth + gap;
      await paintStickerCell(ctx, sticker, stickerX, y, stickerWidth, cellHeight);
      if (right) drawCoverFiltered(ctx, right, stickerX + stickerWidth + gap, y, cellWidth, cellHeight, filter);
    } else if (right) {
      drawCoverFiltered(ctx, right, x + cellWidth + gap, y, cellWidth, cellHeight, filter);
    }
  }

  ctx.fillStyle = frame.footerTextColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const footerY = canvas.height - margin - footerHeight / 2;
  const footerMaxWidth = canvas.width - margin * 2;

  // Taille fixe par défaut, mais le footer peut contenir deux prénoms
  // saisis par l'utilisateur (jusqu'à 24 caractères chacun, voir
  // config.participant.nameMaxLength) — on réduit la police au besoin pour
  // ne jamais déborder du cadre, plutôt que de couper ou chevaucher le texte.
  let fontSize = 20;
  do {
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    fontSize -= 1;
  } while (ctx.measureText(footerText).width > footerMaxWidth && fontSize >= 11);

  ctx.fillText(footerText, canvas.width / 2, footerY);

  return canvas.toDataURL("image/png");
}
