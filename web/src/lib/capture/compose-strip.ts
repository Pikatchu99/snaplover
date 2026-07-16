export interface StripCell {
  /** Moitié gauche = hôte (initiator). */
  left: string;
  /** Moitié droite = invité (peer). */
  right: string;
}

const CELL_WIDTH = 450;
const CELL_HEIGHT = 600;
const GAP = 12;

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

// Compose la bande complète : chaque case = une pose, hôte à gauche / invité
// à droite, cases empilées verticalement. Voir SNAPROOM-SPEC.md §10.
export async function composeStrip(cells: StripCell[]): Promise<string> {
  const loadedCells = await Promise.all(
    cells.map(async (cell) => ({
      left: await loadImage(cell.left),
      right: await loadImage(cell.right),
    })),
  );

  const canvas = document.createElement("canvas");
  canvas.width = CELL_WIDTH * 2 + GAP;
  canvas.height = (CELL_HEIGHT + GAP) * loadedCells.length - GAP;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  loadedCells.forEach(({ left, right }, index) => {
    const y = index * (CELL_HEIGHT + GAP);
    drawCover(ctx, left, 0, y, CELL_WIDTH, CELL_HEIGHT);
    drawCover(ctx, right, CELL_WIDTH + GAP, y, CELL_WIDTH, CELL_HEIGHT);
  });

  return canvas.toDataURL("image/png");
}
