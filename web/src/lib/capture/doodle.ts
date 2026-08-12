import { config } from "@/lib/config";
import type { DoodlePoint, DoodleStroke } from "@/types/doodle";

// Palette réduite alignée sur les tokens de marque (voir CLAUDE.md "Design
// system") — assez de choix pour se démarquer sur n'importe quelle peau/
// éclairage, sans proposer une roue de couleurs complète en pleine séance.
export const DOODLE_COLORS = ["#ffffff", "#fb5a46", "#ff7d54", "#6a48f4"] as const;

// Convertit la position d'un pointeur (coordonnées écran) en point normalisé
// [0,1]x[0,1] dans le repère brut de la caméra. Le canvas est mirroré via
// CSS (-scale-x-100, même traitement que la vidéo — voir CameraTile) pour
// coller à l'aperçu selfie : on inverse x pour stocker chaque point dans le
// même repère que la frame vidéo capturée (lib/capture/capture-frame.ts),
// pas dans le repère écran mirroré.
export function pointFromPointerEvent(canvas: HTMLCanvasElement, clientX: number, clientY: number): DoodlePoint {
  const rect = canvas.getBoundingClientRect();
  const x = 1 - (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return { x, y };
}

function strokeLineWidth(canvasWidth: number): number {
  return Math.max(3, canvasWidth * config.doodle.lineWidthRatio);
}

// Redessine tous les traits depuis leurs points normalisés — appelé à
// chaque changement de trait ET à chaque redimensionnement du canvas (voir
// DoodleCanvas.tsx), donc toujours une repasse complète plutôt qu'un tracé
// incrémental : le nombre de traits/points par pose reste faible, pas de
// souci de perf à redessiner entièrement à chaque frame.
export function redrawStrokes(ctx: CanvasRenderingContext2D, strokes: DoodleStroke[], width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
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
