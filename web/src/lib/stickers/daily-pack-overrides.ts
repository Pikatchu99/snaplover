import type { StickerId, StickerPackId } from "@/types/sticker";

// Force explicitement le pack + les 3 stickers d'un jour précis (ex. un
// lancement, une promo) — clé "YYYY-MM-DD" en UTC, même format que
// daily-pack.ts. Prioritaire sur le tirage déterministe habituel ; retombe
// dessus si aucune entrée pour la date du jour, ou si l'entrée est invalide
// (pack/ids introuvables — voir la validation dans daily-pack.ts), jamais de
// casse silencieuse sur une faute de frappe.
export const DAILY_PACK_OVERRIDES: Record<string, { packId: StickerPackId; stickerIds: StickerId[] }> = {
  // "2026-07-25": { packId: "cats", stickerIds: ["angry-cat-meme-01", "angry-cat-meme-02", "angry-cat-meme-03"] },
};
