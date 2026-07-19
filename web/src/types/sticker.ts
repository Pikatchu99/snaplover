// Vocabulaire du mode Challenge stickers — voir docs/STICKER-CHALLENGES.md.

export type ChallengeMode = "classic" | "challenge";

export type StickerPackId = "couple" | "drama" | "cute";

export type StickerId = string;

// Config visuelle pure (comme FrameDefinition) — le label du pack affiché
// vient de i18n (stickerPacks.<id>), pas d'ici.
export interface StickerDefinition {
  id: StickerId;
  packId: StickerPackId;
  /** Dessine le sticker sur un canvas carré de côté `size`. */
  paint: (ctx: CanvasRenderingContext2D, size: number) => void;
}
