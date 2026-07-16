// Cadres/thèmes et filtres du résultat — voir SNAPROOM-SPEC.md §13.

export type FrameId = "classic" | "noir" | "film";

export interface FrameDefinition {
  id: FrameId;
  label: string;
  /** Couleur des marges/fond, look rétro-cabine. */
  background: string;
  footerTextColor: string;
}

export type FilterId = "classic" | "bw" | "warm";
