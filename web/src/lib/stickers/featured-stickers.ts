import type { StickerId, StickerPackId } from "@/types/sticker";

// Packs éligibles à la rotation du "Pack du jour" — retiré ici, un pack reste
// utilisable normalement en séance (sélecteur de pack sur /create), juste
// jamais tiré automatiquement pour la landing. Vide = retombe sur tous les
// packs (PACK_IDS), jamais de casse silencieuse.
export const DAILY_ROTATION_PACK_IDS: StickerPackId[] = ["drama", "cute"];

// Sous-ensemble de stickers jugés "landing-worthy" par pack — le tirage
// quotidien (daily-pack.ts) pioche en priorité dedans, pour ne jamais
// retomber sur un sticker fade/mauvais en "Pack du jour". Vide par pack =
// pas encore curé, le tirage retombe sur le pack complet (comportement
// actuel), jamais de casse silencieuse.
//
// Pour choisir : `pnpm --filter e2e stickers:catalog` génère une planche
// HTML de tous les stickers publiés (avec leur id), à parcourir puis coller
// les ids qui plaisent ci-dessous.
export const FEATURED_STICKER_IDS: Record<StickerPackId, StickerId[]> = {
  cats: [],
  drama: [],
  cute: [],
};
