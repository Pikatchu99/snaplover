const MAX_WIDTH = 900;
const JPEG_QUALITY = 0.82;

interface CaptureFrameOptions {
  /** Dé-miroir la capture si l'aperçu vidéo est affiché en scaleX(-1). */
  mirrored?: boolean;
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
  const scale = Math.min(1, MAX_WIDTH / w);

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

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
