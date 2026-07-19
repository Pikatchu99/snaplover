// Charge et dessine un sticker sourcé (image réelle, voir sticker-assets.generated.ts)
// — contrairement aux photos capturées (drawCoverFiltered dans compose-strip.ts),
// jamais recadré en "cover" : on ne veut perdre aucun détail du mème/de la
// pose, donc "contain" centré sur un fond transparent.

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadStickerImage(path: string): Promise<HTMLImageElement> {
  let cached = imageCache.get(path);
  if (!cached) {
    cached = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Échec de chargement du sticker (${path})`));
      img.src = path;
    });
    imageCache.set(path, cached);
  }
  return cached;
}

export async function drawStickerImage(path: string, ctx: CanvasRenderingContext2D, size: number): Promise<void> {
  const img = await loadStickerImage(path);
  const ratio = img.width / img.height;
  const w = ratio > 1 ? size : size * ratio;
  const h = ratio > 1 ? size / ratio : size;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
}
