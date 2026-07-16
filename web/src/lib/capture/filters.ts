import type { FilterId } from "@/types/frame";

// Filtres du résultat (E6) — appliqués pixel par pixel (getImageData/
// putImageData) plutôt que via CanvasRenderingContext2D.filter : ce dernier
// est silencieusement ignoré sur certains navigateurs/WebViews mobiles (pas
// d'erreur, juste aucun effet visible — bug rapporté en usage réel), alors
// que la manipulation directe des pixels est universellement supportée.
// Les labels affichés vivent dans i18n/messages.ts (fr.photoStrip.filters).
function clamp(value: number): number {
  return Math.min(255, Math.max(0, value));
}

// Reproduit grayscale(1) contrast(1.05).
function applyBw(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrasted = clamp((gray - 128) * 1.05 + 128);
    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }
}

// Reproduit sepia(0.35) saturate(1.4) brightness(1.05) contrast(1.02), dans cet ordre.
function applyWarm(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const sepiaR = 0.393 * r + 0.769 * g + 0.189 * b;
    const sepiaG = 0.349 * r + 0.686 * g + 0.168 * b;
    const sepiaB = 0.272 * r + 0.534 * g + 0.131 * b;
    r = r * 0.65 + sepiaR * 0.35;
    g = g * 0.65 + sepiaG * 0.35;
    b = b * 0.65 + sepiaB * 0.35;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    r = luminance + (r - luminance) * 1.4;
    g = luminance + (g - luminance) * 1.4;
    b = luminance + (b - luminance) * 1.4;

    r *= 1.05;
    g *= 1.05;
    b *= 1.05;

    r = (r - 128) * 1.02 + 128;
    g = (g - 128) * 1.02 + 128;
    b = (b - 128) * 1.02 + 128;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
}

export const FILTER_PIXEL_OPS: Record<FilterId, ((data: Uint8ClampedArray) => void) | null> = {
  classic: null,
  bw: applyBw,
  warm: applyWarm,
};

export const FILTER_IDS: FilterId[] = ["classic", "bw", "warm"];
