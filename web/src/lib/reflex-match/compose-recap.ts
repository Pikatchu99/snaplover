// Layout fixe (pas de config.ts : purement visuel) — une ligne par manche
// (numéro + issue), score en en-tête, footer de marque — même esprit que
// lib/edge-letters/compose-recap.ts. Contrairement à Copy Cat, pas de
// vraies photos ici : juste du texte, résolu dans la bonne locale par
// l'appelant (voir ReflexMatchRecap.tsx) avant d'être passé ici.
const WIDTH = 480;
const MARGIN = 40;
const HEADER_HEIGHT = 90;
const ROW_HEIGHT = 60;
const ROW_GAP = 12;
const FOOTER_HEIGHT = 60;
const ROW_RADIUS = 14;

export interface ReflexRecapRow {
  label: string;
  outcomeText: string;
  outcome: "win" | "loss" | "draw";
}

interface ComposeRecapOptions {
  scoreText: string;
  footerText: string;
}

const OUTCOME_COLOR: Record<ReflexRecapRow["outcome"], string> = {
  win: "#1f9d55",
  loss: "#fb5a46",
  draw: "#8c8378",
};

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Composite la carte récap Reflex Match : score en en-tête, une ligne par
// manche (numéro + issue), footer de marque.
export async function composeReflexMatchRecap(rows: ReflexRecapRow[], options: ComposeRecapOptions): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEADER_HEIGHT + rows.length * (ROW_HEIGHT + ROW_GAP) + FOOTER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1c1712";
  ctx.textAlign = "center";
  ctx.font = "800 26px system-ui, sans-serif";
  ctx.fillText(options.scoreText, canvas.width / 2, 52);

  let y = HEADER_HEIGHT;
  for (const row of rows) {
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
    ctx.font = "700 18px system-ui, sans-serif";
    ctx.fillText(row.label, x + 24, y + ROW_HEIGHT / 2 + 6);

    ctx.textAlign = "right";
    ctx.fillStyle = OUTCOME_COLOR[row.outcome];
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText(row.outcomeText, x + rowWidth - 24, y + ROW_HEIGHT / 2 + 5);

    y += ROW_HEIGHT + ROW_GAP;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
