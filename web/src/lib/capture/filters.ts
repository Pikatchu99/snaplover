import type { FilterId } from "@/types/frame";

// Filtres du résultat (E6) — appliqués via CanvasRenderingContext2D.filter
// au moment de la composition, pour un rendu identique aperçu/export. Les
// labels affichés vivent dans i18n/messages.ts (fr.photoStrip.filters).
export const FILTER_CSS: Record<FilterId, string> = {
  classic: "none",
  bw: "grayscale(1) contrast(1.05)",
  warm: "sepia(0.35) saturate(1.4) brightness(1.05) contrast(1.02)",
};

export const FILTER_IDS: FilterId[] = ["classic", "bw", "warm"];
