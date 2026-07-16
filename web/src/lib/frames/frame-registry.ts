import type { FrameDefinition, FrameId } from "@/types/frame";

// Cadres de base (§13). Les packs illustrés (hearts, cherry, gingham, tulips,
// denim, meadow…) demandent de vraies illustrations — pas encore d'assets
// dans le repo. Ce registre est structuré pour en accueillir d'autres sans
// changer la logique de composition (voir compose-strip.ts).
export const FRAMES: Record<FrameId, FrameDefinition> = {
  classic: { id: "classic", label: "Classic", background: "#fbf7f1", footerTextColor: "#1c1712" },
  noir: { id: "noir", label: "Noir", background: "#161319", footerTextColor: "#fbf7f1" },
  film: { id: "film", label: "Film", background: "#2b2620", footerTextColor: "#f5ede1" },
};

export const DEFAULT_FRAME_ID: FrameId = "classic";
