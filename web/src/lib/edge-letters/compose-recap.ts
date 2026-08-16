import type { EdgeLettersRoundResult } from "@/types/edge-letters";

// Layout fixe (pas de config.ts : purement visuel, jamais retouché en dehors
// d'une passe design) — une ligne par manche, même esprit que
// lib/doodle-duel/compose-recap.ts.
const WIDTH = 480;
const MARGIN = 40;
const HEADER_HEIGHT = 90;
const ROW_HEIGHT = 72;
const FOOTER_HEIGHT = 60;
const ROW_RADIUS = 16;

interface ComposeRecapOptions {
  scoreText: string;
  footerText: string;
  wonLabel: string;
  lostLabel: string;
  drawLabel: string;
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

// Composite la carte récap Edge Letters : score + une ligne par manche
// (lettres + mot trouvé ou "Manche nulle" + qui a gagné) + footer de marque.
export async function composeEdgeLettersRecap(
  rounds: EdgeLettersRoundResult[],
  isInitiator: boolean,
  options: ComposeRecapOptions,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEADER_HEIGHT + rounds.length * (ROW_HEIGHT + 16) + FOOTER_HEIGHT;

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
    const rowWidth = canvas.width - MARGIN * 2;
    const mine = round.winner === null ? null : round.winner === (isInitiator ? "host" : "guest");

    ctx.save();
    roundRectPath(ctx, x, y, rowWidth, ROW_HEIGHT, ROW_RADIUS);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, rowWidth, ROW_HEIGHT);
    ctx.restore();

    ctx.textAlign = "left";
    ctx.fillStyle = "#1c1712";
    ctx.font = "700 20px system-ui, sans-serif";
    const label = `${round.startLetter}…${round.endLetter} — ${round.word ?? "—"}`;
    ctx.fillText(label, x + 24, y + 32);

    ctx.fillStyle = mine === null ? "#8c8378" : mine ? "#1f9d55" : "#8c8378";
    ctx.font = "500 14px system-ui, sans-serif";
    ctx.fillText(mine === null ? options.drawLabel : mine ? options.wonLabel : options.lostLabel, x + 24, y + 54);

    y += ROW_HEIGHT + 16;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
