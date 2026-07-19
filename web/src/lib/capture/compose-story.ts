import { clipRoundRect, loadImage } from "@/lib/capture/compose-strip";

const WIDTH = 1080;
const HEIGHT = 1920;
const SAFE_MARGIN = 72;
// Réservé en haut pour la marque, en bas pour la tagline — le reste (zone
// "safe") accueille la bande à l'échelle, jamais rognée dessus.
const HEADER_HEIGHT = 160;
const FOOTER_HEIGHT = 160;

// Couleurs de marque — voir CLAUDE.md "Design system" (§13 de
// SNAPROOM-SPEC.md), mêmes valeurs que components/landing/Logo.tsx.
const PAPER = "#fbf7f1";
const INK = "#1c1712";
const CORAL = "#fb5a46";
const VIOLET = "#6a48f4";
const CORAL2 = "#ff7d54";

// Marque SnapLover redessinée en Canvas 2D (même géométrie que
// components/landing/Logo.tsx / app/[locale]/icon.tsx : tuile blanche
// arrondie inclinée -6°, 3 barres). Un canvas ne peut pas rendre le JSX/CSS
// de ces composants, donc on la redessine ici trait pour trait plutôt que
// d'improviser une variante.
function paintMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate((-6 * Math.PI) / 180);

  // Chaque forme dans son propre save/restore : clipRoundRect appelle
  // ctx.clip(), qui INTERSECTE le clip courant plutôt que de le remplacer —
  // sans ça, la 2e barre se retrouve clippée par la région de la 1re
  // (rectangles disjoints → intersection vide → rien ne se dessine).
  ctx.save();
  ctx.fillStyle = "white";
  clipRoundRect(ctx, -size / 2, -size / 2, size, size, size * 0.22);
  ctx.fill();
  ctx.restore();

  const barWidth = size * 0.62;
  const barHeight = size * 0.12;
  const barGap = size * 0.08;
  const barColors = [CORAL, VIOLET, CORAL2];
  const totalHeight = barHeight * 3 + barGap * 2;
  let barY = -totalHeight / 2;
  for (const color of barColors) {
    ctx.save();
    ctx.fillStyle = color;
    clipRoundRect(ctx, -barWidth / 2, barY, barWidth, barHeight, barHeight * 0.3);
    ctx.fill();
    ctx.restore();
    barY += barHeight + barGap;
  }

  ctx.restore();
}

export interface ComposeStoryOptions {
  /** Déjà traduit — ce module ne connaît pas la locale, même convention que compose-strip.ts. */
  tagline: string;
}

// Habille la bande déjà composée (data URL PNG produit par composeStrip) dans
// un cadre 9:16 pensé pour les Stories Instagram/TikTok/Snapchat — le format
// où ce type de contenu se partage et se découvre le plus, contrairement au
// format bande brut qui n'est jamais au bon ratio pour ça.
export async function composeStoryImage(stripDataUrl: string, options: ComposeStoryOptions): Promise<string> {
  const { tagline } = options;
  const strip = await loadImage(stripDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const markSize = 64;
  const markX = WIDTH / 2 - 110;
  const markY = SAFE_MARGIN + (HEADER_HEIGHT - markSize) / 2 - 20;
  paintMark(ctx, markX, markY, markSize);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillText("SnapLover", markX + markSize + 20, markY + markSize / 2);

  const safeTop = SAFE_MARGIN + HEADER_HEIGHT;
  const safeBottom = HEIGHT - SAFE_MARGIN - FOOTER_HEIGHT;
  const safeWidth = WIDTH - SAFE_MARGIN * 2;
  const safeHeight = safeBottom - safeTop;

  // "Contain" (pas "cover") : la bande entière doit rester lisible, jamais
  // rognée — contrairement aux photos individuelles dans compose-strip.ts.
  const scale = Math.min(safeWidth / strip.width, safeHeight / strip.height);
  const drawWidth = strip.width * scale;
  const drawHeight = strip.height * scale;
  const drawX = (WIDTH - drawWidth) / 2;
  const drawY = safeTop + (safeHeight - drawHeight) / 2;
  ctx.drawImage(strip, drawX, drawY, drawWidth, drawHeight);

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 32px system-ui, sans-serif";
  ctx.fillText(tagline, WIDTH / 2, HEIGHT - SAFE_MARGIN - FOOTER_HEIGHT / 2, safeWidth);

  return canvas.toDataURL("image/png");
}
