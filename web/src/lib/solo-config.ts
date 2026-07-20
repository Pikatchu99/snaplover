import { FRAMES, DEFAULT_FRAME_ID } from "@/lib/frames/frame-registry";
import { STICKER_PACKS, DEFAULT_PACK_ID, STICKERS } from "@/lib/stickers/sticker-registry";
import { config } from "@/lib/config";
import type { FrameId, StripStyle } from "@/types/frame";
import type { ChallengeMode, StickerId, StickerPackId } from "@/types/sticker";

// N'accepte les stickers imposés que si chacun existe et appartient au pack
// résolu, et que le compte correspond exactement au nombre de poses — sinon
// on retombe silencieusement sur le tirage aléatoire habituel (pickStickers).
function parsePinnedStickerIds(
  raw: string | undefined,
  stickerPackId: StickerPackId | undefined,
  poses: number,
): StickerId[] | undefined {
  if (!raw || !stickerPackId) return undefined;
  const ids = raw.split(",").filter(Boolean);
  if (ids.length !== poses) return undefined;
  const allValid = ids.every((id) => STICKERS[id]?.packId === stickerPackId);
  return allValid ? ids : undefined;
}

// Config du solo (poses, cadre, style, + pack en challenge) encodée dans
// l'URL par /create — pas de room : un parseur dédié plutôt que de
// réutiliser RoomConfig avec des champs sans objet (voir
// docs/STICKER-CHALLENGES.md). Solo existe en classique (photobooth seul,
// sans sticker) et en challenge (voir "Extension solo classique" plus haut).
// Le prénom reste requis même en solo : signature du footer de la bande.
export interface SoloConfig {
  poses: number;
  frameId: FrameId;
  style: StripStyle;
  mode: ChallengeMode;
  /** Présent uniquement quand mode === "challenge". */
  stickerPackId?: StickerPackId;
  /** Stickers imposés (ex. CTA "Pack du jour" de la landing) — présent
   * uniquement si valides (bon pack, bon compte), sinon tirage aléatoire
   * habituel via pickStickers. */
  stickerIds?: StickerId[];
  name?: string;
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

  const mode: ChallengeMode = firstValue(searchParams.mode) === "challenge" ? "challenge" : "classic";

  // Même règle qu'en duo (room-config.ts) : le layout à sticker n'est pensé
  // que pour le vertical, forcé en mode challenge. Le solo classique garde
  // les deux styles (rien ne l'en empêche techniquement, pas de partenaire
  // requis pour une grille de poses).
  const style: StripStyle =
    mode === "challenge" ? "vertical" : firstValue(searchParams.style) === "grid" ? "grid" : "vertical";

  const packRaw = firstValue(searchParams.pack);
  const stickerPackId: StickerPackId | undefined =
    mode === "challenge" ? (packRaw && packRaw in STICKER_PACKS ? (packRaw as StickerPackId) : DEFAULT_PACK_ID) : undefined;

  const name = firstValue(searchParams.name)?.slice(0, config.participant.nameMaxLength) || undefined;

  const stickerIds = parsePinnedStickerIds(firstValue(searchParams.stickers), stickerPackId, poses);

  return { poses, frameId, style, mode, stickerPackId, stickerIds, name };
}
