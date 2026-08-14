import type { MindMatchRoundResult } from "@/types/mindmatch";

// Layout fixe (pas de config.ts : purement visuel, jamais retouché en dehors
// d'une passe design) — une ligne par manche, pas de dessin à composer
// contrairement à lib/doodle-duel/compose-recap.ts (Mind Match n'a que du
// texte : le mot trouvé et le nombre d'essais).
const WIDTH = 480;
const MARGIN = 40;
const HEADER_HEIGHT = 90;
const ROW_HEIGHT = 72;
const FOOTER_HEIGHT = 60;
const ROW_RADIUS = 16;

interface ComposeRecapOptions {
  scoreText: string;
  footerText: string;
  attemptsLabel: string;
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

// Composite la carte récap d'une partie Mind Match : score + une ligne par
// manche (mot trouvé + nombre d'essais) + footer de marque, même esprit
// visuel que lib/doodle-duel/compose-recap.ts.
export async function composeMindMatchRecap(rounds: MindMatchRoundResult[], options: ComposeRecapOptions): Promise<string> {
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

    ctx.save();
    roundRectPath(ctx, x, y, rowWidth, ROW_HEIGHT, ROW_RADIUS);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, rowWidth, ROW_HEIGHT);
    ctx.restore();

    ctx.textAlign = "left";
    ctx.fillStyle = "#1c1712";
    ctx.font = "700 22px system-ui, sans-serif";
    ctx.fillText(round.word, x + 24, y + 32);

    ctx.fillStyle = "#8c8378";
    ctx.font = "500 14px system-ui, sans-serif";
    ctx.fillText(options.attemptsLabel.replace("{count}", String(round.attempts)), x + 24, y + 54);

    y += ROW_HEIGHT + 16;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
