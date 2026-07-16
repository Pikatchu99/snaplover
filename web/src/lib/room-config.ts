import { FRAMES, DEFAULT_FRAME_ID } from "@/lib/frames/frame-registry";
import { config } from "@/lib/config";
import type { FrameId, StripStyle } from "@/types/frame";

export interface RoomConfig {
  poses: number;
  frameId: FrameId;
  style: StripStyle;
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

  const style: StripStyle = firstValue(searchParams.style) === "grid" ? "grid" : "vertical";

  return { poses, frameId, style };
}
