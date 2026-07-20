import QRCode from "qrcode";
import { clipRoundRect, loadImage } from "@/lib/capture/compose-strip";

const WIDTH = 1080;
const HEIGHT = 1920;
// Réservé de chaque côté pour les bandeaux de texte vertical — le cadre de
// la bande (card) ne peut jamais dépasser dans cette zone, quel que soit son
// ratio (voir calcul de `availableWidth` plus bas).
const SIDE_BAND_WIDTH = 170;

// Couleurs de marque — voir CLAUDE.md "Design system" (§13 de
// SNAPROOM-SPEC.md), mêmes valeurs que components/landing/Logo.tsx.
const INK = "#1c1712";
const PAPER = "#fbf7f1";
const CORAL = "#fb5a46";
const VIOLET = "#6a48f4";
const CORAL2 = "#ff7d54";

function paintGradientBackground(ctx: CanvasRenderingContext2D) {
  // Fond sombre → corail profond (même famille chaude que les CTA en
  // dégradé corail utilisés partout ailleurs dans l'app), pas un violet plat
  // qui ne raccroche à rien de déjà établi dans l'identité visuelle.
  const bg = ctx.createLinearGradient(0, 0, WIDTH * 0.3, HEIGHT);
  bg.addColorStop(0, INK);
  bg.addColorStop(1, "#5c1f16");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Lueur douce (dégradé radial qui s'estompe vers transparent) — juste
  // assez de texture pour ne pas lire comme un aplat plat, sans concurrencer
  // la bande au centre.
  const gradient = ctx.createRadialGradient(WIDTH * 0.85, HEIGHT * 0.1, 0, WIDTH * 0.85, HEIGHT * 0.1, 620);
  gradient.addColorStop(0, `${CORAL2}40`);
  gradient.addColorStop(1, `${CORAL2}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
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

// Perforations façon pellicule 35mm dans une marge latérale — même langage
// visuel que le cadre "film" (lib/frames/paint.ts::film), réutilisé ici
// plutôt qu'un mot inventé : ça raccroche directement au thème "bande
// photo" au lieu d'un slogan arbitraire, et évite toute question de
// tonalité/copywriting sur du texte décoratif.
function paintPerforations(ctx: CanvasRenderingContext2D, x: number) {
  const holeWidth = 30;
  const holeHeight = 44;
  const gap = 36;
  const topY = 220;
  const bottomY = HEIGHT - 220;

  // Chaque trou dans son propre save/restore — clipRoundRect appelle
  // ctx.clip(), qui INTERSECTE le clip courant plutôt que de le remplacer
  // (déjà rencontré deux fois dans ce fichier : sans ça, seul le premier
  // trou se dessine, les suivants tombent dans une intersection vide).
  ctx.fillStyle = `${PAPER}b3`;
  for (let y = topY; y < bottomY; y += holeHeight + gap) {
    ctx.save();
    clipRoundRect(ctx, x - holeWidth / 2, y, holeWidth, holeHeight, 6);
    ctx.fill();
    ctx.restore();
  }
}

export interface ComposeStoryOptions {
  /** Déjà traduit — ce module ne connaît pas la locale, même convention que compose-strip.ts. */
  tagline: string;
  /** QR code vers le site — omis si absent (voir lib/site.ts, jamais d'URL en dur). */
  siteUrl?: string;
}

// Habille la bande déjà composée (data URL PNG produit par composeStrip) dans
// un cadre 9:16 pensé pour les Stories Instagram/TikTok/Snapchat — le format
// où ce type de contenu se partage et se découvre le plus, contrairement au
// format bande brut qui n'est jamais au bon ratio pour ça.
export async function composeStoryImage(stripDataUrl: string, options: ComposeStoryOptions): Promise<string> {
  const { tagline, siteUrl } = options;
  const strip = await loadImage(stripDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  paintGradientBackground(ctx);
  paintPerforations(ctx, SIDE_BAND_WIDTH / 2 + 10);
  paintPerforations(ctx, WIDTH - SIDE_BAND_WIDTH / 2 - 10);

  // En-tête : marque + wordmark empilés et centrés, en blanc (fond sombre).
  const markSize = 100;
  const markY = 130;
  ctx.save();
  paintMark(ctx, WIDTH / 2 - markSize / 2, markY, markSize);
  ctx.restore();

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "800 54px system-ui, sans-serif";
  ctx.fillText("SnapLover", WIDTH / 2, markY + markSize + 26);

  // Carte "photo montée" : la bande repose sur une matte blanche légèrement
  // inclinée, avec une ombre portée — évoque un vrai tirage photobooth posé
  // de travers plutôt qu'une simple capture d'écran recadrée. Largeur
  // plafonnée pour ne jamais empiéter sur les bandeaux latéraux.
  const cardTop = markY + markSize + 120;
  const cardBottom = HEIGHT - 360;
  const cardPadding = 32;
  const availableWidth = WIDTH - SIDE_BAND_WIDTH * 2 - 80;
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

  // Carte de signature unique (dégradé corail, cohérent avec les CTA de
  // l'app) : QR + tagline dans le MÊME bloc plutôt qu'empilés séparément —
  // un empilement pastille-puis-QR-flottant lisait comme deux éléments
  // ajoutés l'un après l'autre, pas comme une signature pensée ensemble.
  const sigCardWidth = WIDTH - SIDE_BAND_WIDTH * 2 - 80;
  const sigCardHeight = 220;
  const sigCardX = WIDTH / 2 - sigCardWidth / 2;
  const sigCardY = HEIGHT - 160 - sigCardHeight;
  const sigCardInnerPadding = 28;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  const sigCardGradient = ctx.createLinearGradient(sigCardX, 0, sigCardX + sigCardWidth, 0);
  sigCardGradient.addColorStop(0, CORAL);
  sigCardGradient.addColorStop(1, CORAL2);
  ctx.fillStyle = sigCardGradient;
  clipRoundRect(ctx, sigCardX, sigCardY, sigCardWidth, sigCardHeight, 28);
  ctx.fill();
  ctx.restore();

  let qrSize = 0;
  if (siteUrl) {
    qrSize = sigCardHeight - sigCardInnerPadding * 2;
    const qrDataUrl = await QRCode.toDataURL(siteUrl, { margin: 0, width: qrSize * 2, color: { dark: INK, light: PAPER } });
    const qrImage = await loadImage(qrDataUrl);
    const qrX = sigCardX + sigCardInnerPadding;
    const qrY = sigCardY + sigCardInnerPadding;

    ctx.save();
    ctx.fillStyle = PAPER;
    clipRoundRect(ctx, qrX, qrY, qrSize, qrSize, 14);
    ctx.fill();
    ctx.drawImage(qrImage, qrX + 10, qrY + 10, qrSize - 20, qrSize - 20);
    ctx.restore();
  }

  // Texte à droite du QR (ou centré sur toute la carte si pas de QR) —
  // retour à la ligne manuel (measureText mot par mot) plutôt qu'un texte
  // sur une seule ligne qui déborderait souvent une fois combiné au QR.
  const textX = siteUrl ? sigCardX + sigCardInnerPadding + qrSize + 28 : sigCardX + sigCardWidth / 2;
  const textMaxWidth = siteUrl ? sigCardX + sigCardWidth - sigCardInnerPadding - textX : sigCardWidth - sigCardInnerPadding * 2;
  const textAlign = siteUrl ? "left" : "center";

  let fontSize = 30;
  let lines: string[] = [];
  do {
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    const words = tagline.split(" ");
    lines = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > textMaxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    fontSize -= 1;
  } while (lines.length > 2 && fontSize > 16);

  ctx.fillStyle = INK;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "middle";
  const lineHeight = fontSize + 12;
  const textBlockHeight = lines.length * lineHeight;
  const firstLineY = sigCardY + sigCardHeight / 2 - textBlockHeight / 2 + lineHeight / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, textX, firstLineY + i * lineHeight);
  });

  return canvas.toDataURL("image/png");
}
