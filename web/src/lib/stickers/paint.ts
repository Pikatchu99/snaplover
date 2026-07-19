// Stickers placeholder du mode Challenge — dessin procédural (pas d'asset
// binaire), même logique que lib/frames/paint.ts, en attendant le vrai
// sourcing/tri des packs (voir docs/STICKER-CHALLENGES.md). Chaque fonction
// dessine sur un canvas carré de côté `size`.

const SKIN = "#f4c99b";
const INK = "#1c1712";
const CORAL = "#fb5a46";

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const top = size * 0.3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + top);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + top);
  ctx.bezierCurveTo(x - size / 2, y + (size + top) / 2, x, y + (size + top) / 2, x, y + size);
  ctx.bezierCurveTo(x, y + (size + top) / 2, x + size / 2, y + (size + top) / 2, x + size / 2, y + top);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + top);
  ctx.closePath();
  ctx.fill();
}

function face(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  circle(ctx, x, y, r, SKIN);
}

// couple

export function heartHands(ctx: CanvasRenderingContext2D, size: number) {
  circle(ctx, size / 2, size * 0.62, size * 0.16, SKIN);
  circle(ctx, size / 2, size * 0.62, size * 0.16, "transparent");
  heart(ctx, size / 2, size * 0.18, size * 0.34, CORAL);
  circle(ctx, size * 0.3, size * 0.7, size * 0.12, SKIN);
  circle(ctx, size * 0.7, size * 0.7, size * 0.12, SKIN);
}

export function backToBack(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size * 0.32, size * 0.28, size * 0.14);
  face(ctx, size * 0.68, size * 0.28, size * 0.14);
  ctx.fillStyle = INK;
  ctx.fillRect(size * 0.24, size * 0.42, size * 0.16, size * 0.4);
  ctx.fillRect(size * 0.6, size * 0.42, size * 0.16, size * 0.4);
}

export function foreheadTouch(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size * 0.38, size * 0.42, size * 0.16);
  face(ctx, size * 0.62, size * 0.42, size * 0.16);
  heart(ctx, size / 2, size * 0.7, size * 0.16, CORAL);
}

export function cheekKiss(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size * 0.42, size * 0.46, size * 0.2);
  face(ctx, size * 0.72, size * 0.42, size * 0.13);
  heart(ctx, size * 0.82, size * 0.24, size * 0.14, CORAL);
}

// drama

export function shockedFace(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size / 2, size / 2, size * 0.32);
  circle(ctx, size * 0.4, size * 0.44, size * 0.035, INK);
  circle(ctx, size * 0.6, size * 0.44, size * 0.035, INK);
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.62, size * 0.09, 0, Math.PI * 2);
  ctx.stroke();
}

export function handOnChest(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size / 2, size * 0.3, size * 0.16);
  ctx.fillStyle = INK;
  ctx.fillRect(size * 0.36, size * 0.46, size * 0.28, size * 0.4);
  circle(ctx, size * 0.5, size * 0.58, size * 0.1, SKIN);
}

export function dramaticPoint(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size * 0.4, size * 0.3, size * 0.16);
  ctx.fillStyle = INK;
  ctx.fillRect(size * 0.28, size * 0.46, size * 0.24, size * 0.36);
  line(ctx, size * 0.5, size * 0.5, size * 0.86, size * 0.24, SKIN, size * 0.06);
  circle(ctx, size * 0.86, size * 0.24, size * 0.045, SKIN);
}

export function fakeCry(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size / 2, size * 0.42, size * 0.22);
  circle(ctx, size * 0.42, size * 0.38, size * 0.03, INK);
  circle(ctx, size * 0.58, size * 0.38, size * 0.03, INK);
  ctx.fillStyle = "#5aa8e6";
  for (const dx of [-0.1, 0.1]) {
    ctx.beginPath();
    ctx.arc(size * (0.5 + dx), size * 0.56, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * (0.5 + dx), size * 0.7, size * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
}

// cute

export function peaceSign(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size * 0.4, size * 0.4, size * 0.2);
  circle(ctx, size * 0.34, size * 0.36, size * 0.025, INK);
  circle(ctx, size * 0.46, size * 0.36, size * 0.025, INK);
  line(ctx, size * 0.68, size * 0.7, size * 0.62, size * 0.32, SKIN, size * 0.05);
  line(ctx, size * 0.76, size * 0.7, size * 0.74, size * 0.32, SKIN, size * 0.05);
}

export function wink(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size / 2, size / 2, size * 0.28);
  line(ctx, size * 0.38, size * 0.44, size * 0.48, size * 0.44, INK, size * 0.02);
  circle(ctx, size * 0.6, size * 0.44, size * 0.025, INK);
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.6, size * 0.08, 0, Math.PI);
  ctx.stroke();
}

export function tongueOut(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size / 2, size / 2, size * 0.28);
  circle(ctx, size * 0.42, size * 0.44, size * 0.025, INK);
  circle(ctx, size * 0.58, size * 0.44, size * 0.025, INK);
  ctx.fillStyle = "#ff8fa3";
  ctx.beginPath();
  ctx.ellipse(size / 2, size * 0.66, size * 0.07, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function duckFace(ctx: CanvasRenderingContext2D, size: number) {
  face(ctx, size / 2, size / 2, size * 0.28);
  line(ctx, size * 0.36, size * 0.42, size * 0.46, size * 0.42, INK, size * 0.02);
  line(ctx, size * 0.54, size * 0.42, size * 0.64, size * 0.42, INK, size * 0.02);
  ctx.fillStyle = CORAL;
  ctx.beginPath();
  ctx.ellipse(size / 2, size * 0.64, size * 0.05, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}
