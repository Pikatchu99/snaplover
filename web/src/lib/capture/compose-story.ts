import { clipRoundRect, loadImage } from "@/lib/capture/compose-strip";

const WIDTH = 1080;
const HEIGHT = 1920;

// Couleurs de marque — voir CLAUDE.md "Design system" (§13 de
// SNAPROOM-SPEC.md), mêmes valeurs que components/landing/Logo.tsx.
const DARK = "#161319";
const INK = "#1c1712";
const PAPER = "#fbf7f1";
const CORAL = "#fb5a46";
const VIOLET = "#6a48f4";
const CORAL2 = "#ff7d54";

function paintGradientBackground(ctx: CanvasRenderingContext2D) {
  // Fond sombre dégradé (même famille que l'écran de capture, §13) plutôt
  // qu'un aplat clair : la bande (blanche/claire) et la marque s'y détachent
  // beaucoup mieux, et c'est le registre visuel des templates de Story qui
  // fonctionnent (fond contrasté, pas juste "une page web recadrée").
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, DARK);
  bg.addColorStop(1, "#2a1f4d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Lueurs douces (dégradés radiaux qui s'estompent vers transparent) dans
  // deux coins opposés — juste assez de texture pour ne pas lire comme un
  // aplat plat, sans concurrencer la bande au centre.
  const glow = (x: number, y: number, radius: number, color: string) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `${color}55`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  };
  glow(WIDTH * 0.1, HEIGHT * 0.08, 520, CORAL);
  glow(WIDTH * 0.9, HEIGHT * 0.92, 560, VIOLET);
}

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

  paintGradientBackground(ctx);

  // En-tête : marque + wordmark empilés et centrés, en blanc (fond sombre).
  const markSize = 104;
  const markY = 150;
  ctx.save();
  paintMark(ctx, WIDTH / 2 - markSize / 2, markY, markSize);
  ctx.restore();

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "800 56px system-ui, sans-serif";
  ctx.fillText("SnapLover", WIDTH / 2, markY + markSize + 28);

  // Carte "photo montée" : la bande repose sur une matte blanche légèrement
  // inclinée, avec une ombre portée — évoque un vrai tirage photobooth posé
  // de travers plutôt qu'une simple capture d'écran recadrée.
  const cardTop = markY + markSize + 130;
  const cardBottom = HEIGHT - 300;
  const cardPadding = 36;
  const availableWidth = WIDTH - 160;
  const availableHeight = cardBottom - cardTop;
  const scale = Math.min((availableWidth - cardPadding * 2) / strip.width, (availableHeight - cardPadding * 2) / strip.height);
  const stripWidth = strip.width * scale;
  const stripHeight = strip.height * scale;
  const cardWidth = stripWidth + cardPadding * 2;
  const cardHeight = stripHeight + cardPadding * 2;
  const cardCenterX = WIDTH / 2;
  const cardCenterY = cardTop + availableHeight / 2;

  ctx.save();
  ctx.translate(cardCenterX, cardCenterY);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = PAPER;
  clipRoundRect(ctx, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 20);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.drawImage(strip, -stripWidth / 2, -stripHeight / 2, stripWidth, stripHeight);
  ctx.restore();

  // Tagline en pastille colorée plutôt qu'en petit texte discret — plus
  // affirmé, cohérent avec les CTA en dégradé corail utilisés ailleurs dans
  // l'app (create/page.tsx, PhotoStrip.tsx).
  ctx.font = "700 34px system-ui, sans-serif";
  const taglinePadding = 40;
  const taglineWidth = ctx.measureText(tagline).width + taglinePadding * 2;
  const taglineHeight = 88;
  const taglineY = HEIGHT - 170;

  const pillGradient = ctx.createLinearGradient(WIDTH / 2 - taglineWidth / 2, 0, WIDTH / 2 + taglineWidth / 2, 0);
  pillGradient.addColorStop(0, CORAL);
  pillGradient.addColorStop(1, CORAL2);
  ctx.fillStyle = pillGradient;
  clipRoundRect(ctx, WIDTH / 2 - taglineWidth / 2, taglineY - taglineHeight / 2, taglineWidth, taglineHeight, taglineHeight / 2);
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tagline, WIDTH / 2, taglineY + 2);

  return canvas.toDataURL("image/png");
}
