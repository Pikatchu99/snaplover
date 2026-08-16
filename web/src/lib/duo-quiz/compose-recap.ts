// Layout fixe (pas de config.ts : purement visuel) — une ligne par question
// (libellé déjà résolu dans la bonne locale par l'appelant, voir
// DuoQuizRecap.tsx) avec un indicateur correct/incorrect pour chaque côté,
// score en en-tête, footer de marque — même esprit que
// lib/edge-letters/compose-recap.ts.
const WIDTH = 480;
const MARGIN = 40;
const HEADER_HEIGHT = 90;
const ROW_HEIGHT = 60;
const ROW_GAP = 12;
const FOOTER_HEIGHT = 60;
const ROW_RADIUS = 14;
const DOT_RADIUS = 7;

const CORRECT_COLOR = "#1f9d55";
const INCORRECT_COLOR = "#fb5a46";

export interface DuoQuizRecapRow {
  label: string;
  hostCorrect: boolean;
  guestCorrect: boolean;
}

interface ComposeRecapOptions {
  scoreText: string;
  footerText: string;
  youLabel: string;
  partnerLabel: string;
  /** true si l'appelant est l'hôte — décide quelle colonne (host/guest)
   * s'affiche sous "Toi" vs "Partenaire". */
  isInitiator: boolean;
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

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, correct: boolean) {
  ctx.beginPath();
  ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = correct ? CORRECT_COLOR : INCORRECT_COLOR;
  ctx.fill();
}

// Composite la carte récap Duo Quiz : score en en-tête, une ligne par
// question (libellé + un point par côté), footer de marque.
export async function composeDuoQuizRecap(rows: DuoQuizRecapRow[], options: ComposeRecapOptions): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEADER_HEIGHT + rows.length * (ROW_HEIGHT + ROW_GAP) + FOOTER_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1c1712";
  ctx.textAlign = "center";
  ctx.font = "800 24px system-ui, sans-serif";
  ctx.fillText(options.scoreText, canvas.width / 2, 40);
  ctx.font = "500 12px system-ui, sans-serif";
  ctx.fillStyle = "#8c8378";
  ctx.fillText(`${options.youLabel} / ${options.partnerLabel}`, canvas.width / 2, 64);

  let y = HEADER_HEIGHT;
  const dotsX1 = canvas.width - MARGIN - 44;
  const dotsX2 = canvas.width - MARGIN - 16;
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
    ctx.font = "600 15px system-ui, sans-serif";
    const maxLabelWidth = dotsX1 - x - 24 - 28;
    let label = row.label;
    while (ctx.measureText(label).width > maxLabelWidth && label.length > 1) {
      label = label.slice(0, -1);
    }
    if (label !== row.label) label = `${label.trimEnd()}…`;
    ctx.fillText(label, x + 20, y + ROW_HEIGHT / 2 + 5);

    const mine = options.isInitiator ? row.hostCorrect : row.guestCorrect;
    const partner = options.isInitiator ? row.guestCorrect : row.hostCorrect;
    drawDot(ctx, dotsX1, y + ROW_HEIGHT / 2, mine);
    drawDot(ctx, dotsX2, y + ROW_HEIGHT / 2, partner);

    y += ROW_HEIGHT + ROW_GAP;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - FOOTER_HEIGHT / 2);

  return canvas.toDataURL("image/png");
}
