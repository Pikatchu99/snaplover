// Cadres/thèmes et filtres du résultat — voir SNAPROOM-SPEC.md §13.

export type FrameId =
  | "classic"
  | "noir"
  | "film"
  | "pop"
  | "kraft"
  | "vintage"
  | "gingham"
  | "checkers"
  | "denim"
  | "valentine";

// Config visuelle pure (invariante par locale) — le label affiché vient de
// i18n/messages.ts (fr.frames), pas d'ici.
export interface FrameDefinition {
  id: FrameId;
  footerTextColor: string;
  /**
   * Peint le fond + toute décoration (motif, perforations, grain…) sur le
   * canvas final, avant les cases. `margin` = marge rétro-cabine autour des
   * cases (utile pour caler des décors sur les bords, ex. le film).
   */
  paint: (ctx: CanvasRenderingContext2D, width: number, height: number, margin: number) => void;
}

export type FilterId = "classic" | "bw" | "warm";

/** Style de bande — voir SNAPROOM-SPEC.md §10. */
export type StripStyle = "vertical" | "grid";
