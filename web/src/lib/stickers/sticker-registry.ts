import type { StickerDefinition, StickerId, StickerPackId } from "@/types/sticker";
import { STICKER_ASSETS } from "@/lib/stickers/sticker-assets.generated";
import { drawStickerImage } from "@/lib/stickers/draw-sticker-image";

// Stickers du mode Challenge (docs/STICKER-CHALLENGES.md), sourcés et
// validés par l'auteur (voir docs/STICKER-SOURCING.md). Les labels affichés
// vivent dans i18n (stickerPacks), pas ici — registre pure config visuelle,
// même principe que lib/frames/frame-registry.ts.
export const STICKERS: Record<StickerId, StickerDefinition> = Object.fromEntries(
  STICKER_ASSETS.map((asset) => [
    asset.id,
    {
      id: asset.id,
      packId: asset.packId,
      paint: (ctx: CanvasRenderingContext2D, size: number) => drawStickerImage(asset.path, ctx, size),
    },
  ]),
);

export const STICKER_PACKS: Record<StickerPackId, { id: StickerPackId; stickerIds: StickerId[] }> = {
  cats: { id: "cats", stickerIds: [] },
  drama: { id: "drama", stickerIds: [] },
  cute: { id: "cute", stickerIds: [] },
};
for (const asset of STICKER_ASSETS) {
  STICKER_PACKS[asset.packId].stickerIds.push(asset.id);
}

export const PACK_IDS: StickerPackId[] = ["cats", "drama", "cute"];

export const DEFAULT_PACK_ID: StickerPackId = "cats";
