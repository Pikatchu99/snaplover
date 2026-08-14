import { redrawStrokes } from "@/lib/capture/doodle";
import type { DuelRoundResult } from "@/types/duel";

// Layout fixe (pas de config.ts : purement visuel, jamais retouché en
// dehors d'une passe design) — une carte par manche, empilées verticalement.
const CARD_WIDTH = 320;
const CARD_HEIGHT = 320;
const CARD_RADIUS = 16;
const CARD_GAP = 28;
const MARGIN = 40;
const HEADER_HEIGHT = 90;
const LABEL_HEIGHT = 56;
const FOOTER_HEIGHT = 60;

interface ComposeRecapOptions {
  scoreText: string;
  footerText: string;
  guessedLabel: string;
  notGuessedLabel: string;
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

// Composite la carte récap d'une partie Doodle Duel : score + une carte par
// manche (dessin final + mot + résultat) + footer de marque, dans le même
// esprit visuel que lib/capture/compose-strip.ts. Le dessin de chaque manche
// est rendu sur un canvas transparent séparé (redrawStrokes commence par un
// clearRect — l'appliquer directement sur le canvas final effacerait le fond
// blanc de la carte) puis composité par-dessus le fond blanc déjà peint.
export async function composeDuelRecap(rounds: DuelRoundResult[], options: ComposeRecapOptions): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = MARGIN * 2 + CARD_WIDTH;
  canvas.height = HEADER_HEIGHT + rounds.length * (LABEL_HEIGHT + CARD_HEIGHT + CARD_GAP) + FOOTER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1c1712";
  ctx.textAlign = "center";
  ctx.font = "800 26px system-ui, sans-serif";
  ctx.fillText(options.scoreText, canvas.width / 2, 52);

  let y = HEADER_HEIGHT;
  for (const round of rounds) {
    const x = MARGIN;

    ctx.fillStyle = "#1c1712";
    ctx.font = "700 22px system-ui, sans-serif";
    ctx.fillText(round.word, canvas.width / 2, y + 26);

    const resultText = round.guessed ? options.guessedLabel.replace("{seconds}", String(Math.round(round.timeMs / 1000))) : options.notGuessedLabel;
    ctx.fillStyle = round.guessed ? "#1f9d55" : "#8c8378";
    ctx.font = "500 14px system-ui, sans-serif";
    ctx.fillText(resultText, canvas.width / 2, y + 46);

    const cardY = y + LABEL_HEIGHT;
    ctx.save();
    roundRectPath(ctx, x, cardY, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, cardY, CARD_WIDTH, CARD_HEIGHT);
    ctx.restore();

    const thumb = document.createElement("canvas");
    thumb.width = CARD_WIDTH;
    thumb.height = CARD_HEIGHT;
    const thumbCtx = thumb.getContext("2d");
    if (thumbCtx) redrawStrokes(thumbCtx, round.strokes, CARD_WIDTH, CARD_HEIGHT);
    ctx.drawImage(thumb, x, cardY);

    y = cardY + CARD_HEIGHT + CARD_GAP;
  }

  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
