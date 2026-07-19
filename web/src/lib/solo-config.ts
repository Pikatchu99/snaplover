import { FRAMES, DEFAULT_FRAME_ID } from "@/lib/frames/frame-registry";
import { STICKER_PACKS, DEFAULT_PACK_ID } from "@/lib/stickers/sticker-registry";
import { config } from "@/lib/config";
import type { FrameId } from "@/types/frame";
import type { StickerPackId } from "@/types/sticker";

// Config du challenge solo (poses, cadre, pack) encodée dans l'URL par /create
// — pas de nom, pas de style (toujours "moi | sticker"), pas de room : un
// parseur dédié plutôt que de réutiliser RoomConfig avec des champs sans
// objet (voir docs/STICKER-CHALLENGES.md).
export interface SoloConfig {
  poses: number;
  frameId: FrameId;
  stickerPackId: StickerPackId;
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSoloConfig(searchParams: SearchParams): SoloConfig {
  const posesRaw = Number(firstValue(searchParams.poses));
  const poses = (config.roomConfig.validPoses as readonly number[]).includes(posesRaw)
    ? posesRaw
    : config.roomConfig.defaultPoses;

  const frameRaw = firstValue(searchParams.frame);
  const frameId: FrameId = frameRaw && frameRaw in FRAMES ? (frameRaw as FrameId) : DEFAULT_FRAME_ID;

  const packRaw = firstValue(searchParams.pack);
  const stickerPackId: StickerPackId = packRaw && packRaw in STICKER_PACKS ? (packRaw as StickerPackId) : DEFAULT_PACK_ID;

  return { poses, frameId, stickerPackId };
}
