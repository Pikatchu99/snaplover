import { config } from "@/lib/config";

interface CaptureFrameOptions {
  /** Dé-miroir la capture si l'aperçu vidéo est affiché en scaleX(-1). */
  mirrored?: boolean;
  /** Canvas de dessin collaboratif (voir hooks/use-doodle.ts) à incruster sur
   * la frame. Même repère que la vidéo brute (DoodleCanvas corrige déjà le
   * miroir CSS au moment de convertir la position du pointeur) : on peut
   * donc le dessiner sous la même transformation que la vidéo ci-dessous,
   * sans logique de miroir séparée. */
  overlayCanvas?: HTMLCanvasElement | null;
}

// Capture la frame locale (<video> → <canvas>) en JPEG. Résolution moyenne
// suffisante pour l'échange P2P — voir SNAPROOM-SPEC.md §10. La capture
// locale pleine résolution (ImageCapture.takePhoto) est un enrichissement
// futur, pas nécessaire pour la bande partagée du MVP.
export function captureFrame(video: HTMLVideoElement, options: CaptureFrameOptions = {}): string {
  const { videoWidth: w, videoHeight: h } = video;
  if (w === 0 || h === 0) {
    throw new Error("Vidéo pas encore prête (videoWidth/videoHeight = 0) — capture impossible.");
  }
  const scale = Math.min(1, config.capture.maxWidth / w);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  if (options.mirrored) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const overlay = options.overlayCanvas;
  if (overlay && overlay.width > 0 && overlay.height > 0) {
    ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL("image/jpeg", config.capture.jpegQuality);
}
