import type { StickerDefinition, StickerId, StickerPackId } from "@/types/sticker";
import * as paint from "@/lib/stickers/paint";

// Stickers du mode Challenge (docs/STICKER-CHALLENGES.md). Les labels
// affichés vivent dans i18n (stickerPacks), pas ici — registre pure config
// visuelle, même principe que lib/frames/frame-registry.ts.
export const STICKERS: Record<StickerId, StickerDefinition> = {
  "couple-heart-hands": { id: "couple-heart-hands", packId: "couple", paint: paint.heartHands },
  "couple-back-to-back": { id: "couple-back-to-back", packId: "couple", paint: paint.backToBack },
  "couple-forehead-touch": { id: "couple-forehead-touch", packId: "couple", paint: paint.foreheadTouch },
  "couple-cheek-kiss": { id: "couple-cheek-kiss", packId: "couple", paint: paint.cheekKiss },

  "drama-shocked-face": { id: "drama-shocked-face", packId: "drama", paint: paint.shockedFace },
  "drama-hand-on-chest": { id: "drama-hand-on-chest", packId: "drama", paint: paint.handOnChest },
  "drama-dramatic-point": { id: "drama-dramatic-point", packId: "drama", paint: paint.dramaticPoint },
  "drama-fake-cry": { id: "drama-fake-cry", packId: "drama", paint: paint.fakeCry },

  "cute-peace-sign": { id: "cute-peace-sign", packId: "cute", paint: paint.peaceSign },
  "cute-wink": { id: "cute-wink", packId: "cute", paint: paint.wink },
  "cute-tongue-out": { id: "cute-tongue-out", packId: "cute", paint: paint.tongueOut },
  "cute-duck-face": { id: "cute-duck-face", packId: "cute", paint: paint.duckFace },
};

export const STICKER_PACKS: Record<StickerPackId, { id: StickerPackId; stickerIds: StickerId[] }> = {
  couple: {
    id: "couple",
    stickerIds: ["couple-heart-hands", "couple-back-to-back", "couple-forehead-touch", "couple-cheek-kiss"],
  },
  drama: {
    id: "drama",
    stickerIds: ["drama-shocked-face", "drama-hand-on-chest", "drama-dramatic-point", "drama-fake-cry"],
  },
  cute: {
    id: "cute",
    stickerIds: ["cute-peace-sign", "cute-wink", "cute-tongue-out", "cute-duck-face"],
  },
};

export const PACK_IDS: StickerPackId[] = ["couple", "drama", "cute"];

export const DEFAULT_PACK_ID: StickerPackId = "couple";
