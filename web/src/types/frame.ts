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

/** Position (en x) de chaque frontière interne entre colonnes de poses — voir
 * `film` dans lib/frames/paint.ts, seul cadre qui s'en sert pour l'instant. */
export interface FrameCellLayout {
  columnBoundaries: number[];
}

// Config visuelle pure (invariante par locale) — le label affiché vient de
// i18n/messages.ts (fr.frames), pas d'ici.
export interface FrameDefinition {
  id: FrameId;
  footerTextColor: string;
  /**
   * Peint le fond + toute décoration (motif, perforations, grain…) sur le
   * canvas final, avant les cases. `margin` = marge rétro-cabine autour des
   * cases (utile pour caler des décors sur les bords, ex. le film).
   * `cellLayout` optionnel : géométrie des colonnes, pour les cadres qui
   * dessinent une décoration entre chaque photo, pas seulement en bordure.
   */
  paint: (ctx: CanvasRenderingContext2D, width: number, height: number, margin: number, cellLayout?: FrameCellLayout) => void;
}

export type FilterId = "classic" | "bw" | "warm";

/** Style de bande — voir SNAPROOM-SPEC.md §10. */
export type StripStyle = "vertical" | "grid";
