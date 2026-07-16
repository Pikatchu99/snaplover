import type { FrameDefinition, FrameId } from "@/types/frame";

// Cadres de base (§13). Les packs illustrés (hearts, cherry, gingham, tulips,
// denim, meadow…) demandent de vraies illustrations — pas encore d'assets
// dans le repo. Ce registre est structuré pour en accueillir d'autres sans
// changer la logique de composition (voir compose-strip.ts). Les labels
// affichés vivent dans i18n/messages.ts (fr.frames), pas ici.
export const FRAMES: Record<FrameId, FrameDefinition> = {
  classic: { id: "classic", background: "#fbf7f1", footerTextColor: "#1c1712" },
  noir: { id: "noir", background: "#161319", footerTextColor: "#fbf7f1" },
  film: { id: "film", background: "#2b2620", footerTextColor: "#f5ede1" },
};

export const FRAME_IDS: FrameId[] = ["classic", "noir", "film"];

export const DEFAULT_FRAME_ID: FrameId = "classic";
