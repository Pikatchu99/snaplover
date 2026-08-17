import { loadImage, clipRoundRect } from "@/lib/capture/compose-strip";
import type { CopyCatRoundResult } from "@/types/copy-cat";

// Layout fixe (pas de config.ts : purement visuel) — une carte par manche
// (référence + tentative côte à côte + badge de verdict), score en
// en-tête, footer de marque — même esprit que lib/edge-letters/compose-recap.ts,
// mais avec de VRAIES photos à charger (voir loadImage, réutilisé tel quel
// depuis lib/capture/compose-strip.ts plutôt que réinventé) puisque c'est
// le premier récap du hub à afficher des clichés plutôt que des formes
// géométriques.
const WIDTH = 480;
const MARGIN = 32;
const HEADER_HEIGHT = 80;
const THUMB_WIDTH = 190;
const THUMB_HEIGHT = 142;
const THUMB_GAP = 12;
const ROW_GAP = 20;
const BADGE_HEIGHT = 28;
const FOOTER_HEIGHT = 50;
const RADIUS = 12;

interface ComposeRecapOptions {
  scoreText: string;
  footerText: string;
  verdictLabels: Record<CopyCatRoundResult["verdict"], string>;
}

const VERDICT_COLOR: Record<CopyCatRoundResult["verdict"], string> = {
  "nailed-it": "#1f9d55",
  close: "#ff7d54",
  "not-quite": "#fb5a46",
};

function drawThumb(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number) {
  ctx.save();
  clipRoundRect(ctx, x, y, THUMB_WIDTH, THUMB_HEIGHT, RADIUS);
  ctx.clip();
  // "cover" — recadre au centre plutôt que d'étirer, même logique que
  // l'aperçu vidéo en direct (object-cover).
  const scale = Math.max(THUMB_WIDTH / img.width, THUMB_HEIGHT / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  ctx.drawImage(img, x + (THUMB_WIDTH - drawWidth) / 2, y + (THUMB_HEIGHT - drawHeight) / 2, drawWidth, drawHeight);
  ctx.restore();
}

// Composite la carte récap Copy Cat : une ligne par manche (référence du
// poseur à gauche, tentative du mimic à droite, badge de verdict dessous),
// score en en-tête, footer de marque.
export async function composeCopyCatRecap(rounds: CopyCatRoundResult[], options: ComposeRecapOptions): Promise<string> {
  const images = await Promise.all(
    rounds.map(async (round) => ({
      reference: await loadImage(round.referenceUrl),
      attempt: await loadImage(round.attemptUrl),
    })),
  );

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEADER_HEIGHT + rounds.length * (THUMB_HEIGHT + BADGE_HEIGHT + ROW_GAP) + FOOTER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#1c1712";
  ctx.font = "800 24px system-ui, sans-serif";
  ctx.fillText(options.scoreText, canvas.width / 2, 44);

  let y = HEADER_HEIGHT;
  const leftX = MARGIN;
  const rightX = MARGIN + THUMB_WIDTH + THUMB_GAP;

  rounds.forEach((round, index) => {
    const { reference, attempt } = images[index];
    drawThumb(ctx, reference, leftX, y);
    drawThumb(ctx, attempt, rightX, y);

    const badgeY = y + THUMB_HEIGHT + 8;
    ctx.textAlign = "center";
    ctx.fillStyle = VERDICT_COLOR[round.verdict];
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillText(options.verdictLabels[round.verdict], canvas.width / 2, badgeY + BADGE_HEIGHT / 2 + 5);

    y += THUMB_HEIGHT + BADGE_HEIGHT + ROW_GAP;
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
