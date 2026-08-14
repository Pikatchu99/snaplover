import { config } from "@/lib/config";
import { loadImage } from "@/lib/capture/compose-strip";
import type { DoodlePoint, DoodleStroke } from "@/types/doodle";

// Palette réduite alignée sur les tokens de marque (voir CLAUDE.md "Design
// system") — assez de choix pour se démarquer sur n'importe quelle photo,
// sans proposer une roue de couleurs complète.
export const DOODLE_COLORS = ["#ffffff", "#fb5a46", "#ff7d54", "#6a48f4"] as const;

// Convertit la position d'un pointeur (coordonnées écran) en point normalisé
// [0,1]x[0,1] relatif au canvas — pas de correction de miroir ici : le
// calque de dessin se superpose à la bande déjà composée (une image, pas un
// flux vidéo), voir PhotoStrip.tsx.
export function pointFromPointerEvent(canvas: HTMLCanvasElement, clientX: number, clientY: number): DoodlePoint {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return { x, y };
}

function strokeLineWidth(canvasWidth: number): number {
  return Math.max(3, canvasWidth * config.doodle.lineWidthRatio);
}

// Trace tous les traits depuis leurs points normalisés, SANS vider le canvas
// au préalable — utilisé par flattenDoodle() pour dessiner par-dessus
// l'image déjà présente. redrawStrokes (ci-dessous) ajoute le clearRect pour
// le calque live, qui doit rester transparent entre deux redraws.
function paintStrokes(ctx: CanvasRenderingContext2D, strokes: DoodleStroke[], width: number, height: number) {
  if (width === 0 || height === 0) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = strokeLineWidth(width);

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    const [first, ...rest] = stroke.points;

    if (rest.length === 0) {
      // Un tap sans glisser : beginPath/moveTo seul ne trace rien de
      // visible, on dessine un petit rond plein à la place.
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(first.x * width, first.y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.strokeStyle = stroke.color;
    ctx.beginPath();
    ctx.moveTo(first.x * width, first.y * height);
    for (const point of rest) ctx.lineTo(point.x * width, point.y * height);
    ctx.stroke();
  }
}

// Redessine tous les traits depuis leurs points normalisés — appelé à
// chaque changement de trait ET à chaque redimensionnement du canvas (voir
// DoodleCanvas.tsx), donc toujours une repasse complète plutôt qu'un tracé
// incrémental : le nombre de traits/points par pose reste faible, pas de
// souci de perf à redessiner entièrement à chaque frame. Le calque live doit
// rester transparent entre deux redraws, d'où le clearRect (voir
// paintStrokes ci-dessus pour la variante sans clear, utilisée par
// flattenDoodle pour dessiner par-dessus une image déjà présente).
export function redrawStrokes(ctx: CanvasRenderingContext2D, strokes: DoodleStroke[], width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  paintStrokes(ctx, strokes, width, height);
}

// Aplati le calque de dessin sur la bande déjà composée, à la résolution
// native de l'image (pas celle, réduite, du canvas affiché à l'écran) — les
// points normalisés se remettent à l'échelle de n'importe quelle résolution
// cible sans perte. Appelé à la demande (télécharger/partager), pas en
// continu : recomposer un PNG plein format à chaque point tracé serait
// coûteux et inutile tant que personne n'exporte encore — voir PhotoStrip.tsx.
export async function flattenDoodle(baseUrl: string, strokes: DoodleStroke[]): Promise<string> {
  if (strokes.length === 0) return baseUrl;

  const image = await loadImage(baseUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.drawImage(image, 0, 0);
  paintStrokes(ctx, strokes, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}
