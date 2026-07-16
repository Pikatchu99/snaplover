// Cadres/thèmes et filtres du résultat — voir SNAPROOM-SPEC.md §13.

export type FrameId = "classic" | "noir" | "film";

// Config visuelle pure (invariante par locale) — le label affiché vient de
// i18n/messages.ts (fr.frames), pas d'ici.
export interface FrameDefinition {
  id: FrameId;
  /** Couleur des marges/fond, look rétro-cabine. */
  background: string;
  footerTextColor: string;
}

export type FilterId = "classic" | "bw" | "warm";

/** Style de bande — voir SNAPROOM-SPEC.md §10. */
export type StripStyle = "vertical" | "grid";
