import type { FrameDefinition, FrameId } from "@/types/frame";
import * as paint from "@/lib/frames/paint";

// Cadres (§13). Les labels affichés vivent dans i18n/messages.ts (fr.frames),
// pas ici — ce registre ne contient que la config visuelle pure.
export const FRAMES: Record<FrameId, FrameDefinition> = {
  classic: { id: "classic", footerTextColor: "#1c1712", paint: paint.solid("#fbf7f1") },
  noir: { id: "noir", footerTextColor: "#fbf7f1", paint: paint.solid("#161319") },
  film: { id: "film", footerTextColor: "#fbf7f1", paint: paint.film },
  pop: { id: "pop", footerTextColor: "#1c1712", paint: paint.pop },
  kraft: { id: "kraft", footerTextColor: "#1c1712", paint: paint.kraft },
  vintage: { id: "vintage", footerTextColor: "#4a321c", paint: paint.vintage },
  gingham: { id: "gingham", footerTextColor: "#1c1712", paint: paint.gingham },
  checkers: { id: "checkers", footerTextColor: "#1c1712", paint: paint.checkers },
  denim: { id: "denim", footerTextColor: "#fbf7f1", paint: paint.denim },
};

export const FRAME_IDS: FrameId[] = ["classic", "noir", "film", "pop", "kraft", "vintage", "gingham", "checkers", "denim"];

export const DEFAULT_FRAME_ID: FrameId = "classic";
