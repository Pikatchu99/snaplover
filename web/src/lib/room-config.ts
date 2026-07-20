import { FRAMES, DEFAULT_FRAME_ID } from "@/lib/frames/frame-registry";
import { STICKER_PACKS, DEFAULT_PACK_ID, STICKERS } from "@/lib/stickers/sticker-registry";
import { config } from "@/lib/config";
import type { FrameId, StripStyle } from "@/types/frame";
import type { ChallengeMode, StickerId, StickerPackId } from "@/types/sticker";

export interface RoomConfig {
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
  /** Prénom local à CE navigateur (jamais dans le lien partagé) — voir app/create, app/join. */
  name?: string;
}

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

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Config de room (poses, cadre, style) encodée dans l'URL par la page
// Créer une room (E3) — pas de BDD au MVP, l'URL partagée fait foi.
export function parseRoomConfig(searchParams: SearchParams): RoomConfig {
  const posesRaw = Number(firstValue(searchParams.poses));
  const poses = (config.roomConfig.validPoses as readonly number[]).includes(posesRaw)
    ? posesRaw
    : config.roomConfig.defaultPoses;

  const frameRaw = firstValue(searchParams.frame);
  const frameId: FrameId = frameRaw && frameRaw in FRAMES ? (frameRaw as FrameId) : DEFAULT_FRAME_ID;

  const mode: ChallengeMode = firstValue(searchParams.mode) === "challenge" ? "challenge" : "classic";

  // Le layout 3 colonnes du challenge (hôte | sticker | invité) n'est pensé
  // que pour le vertical — on force plutôt que d'ajouter une variante
  // grid+challenge hors scope du MVP (voir docs/STICKER-CHALLENGES.md).
  const style: StripStyle =
    mode === "challenge" ? "vertical" : firstValue(searchParams.style) === "grid" ? "grid" : "vertical";

  const packRaw = firstValue(searchParams.pack);
  const stickerPackId: StickerPackId | undefined =
    mode === "challenge" ? (packRaw && packRaw in STICKER_PACKS ? (packRaw as StickerPackId) : DEFAULT_PACK_ID) : undefined;

  const name = firstValue(searchParams.name)?.slice(0, config.participant.nameMaxLength) || undefined;

  const stickerIds = parsePinnedStickerIds(firstValue(searchParams.stickers), stickerPackId, poses);

  return { poses, frameId, style, mode, stickerPackId, stickerIds, name };
}
