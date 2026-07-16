import { FRAMES } from "@/lib/frames/frame-registry";
import { cn } from "@/lib/utils";
import type { FrameId, StripStyle } from "@/types/frame";

interface RoomPreviewProps {
  poses: number;
  style: StripStyle;
  frameId: FrameId;
}

// Aperçu live de la bande pendant le réglage (E3, "Set up your room") — même
// logique de disposition que compose-strip.ts (columns selon le style),
// simple CSS ici (pas de canvas), juste pour prévisualiser le choix.
export function RoomPreview({ poses, style, frameId }: RoomPreviewProps) {
  const frame = FRAMES[frameId];
  const columns = style === "grid" ? 2 : 1;

  return (
    <div
      className="mx-auto w-full max-w-[220px] rounded-2xl border border-[#ece4d8] p-3 shadow-sm"
      style={{ background: frame.background }}
    >
      <div className={cn("grid gap-1.5", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {Array.from({ length: poses }).map((_, i) => (
          <div key={i} className="flex aspect-4/3 gap-1 overflow-hidden rounded-md">
            <div className="flex-1 bg-[#ffb787]" />
            <div className="flex-1 bg-[#b9c2f7]" />
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[9px] tracking-widest" style={{ color: frame.footerTextColor }}>
        PREVIEW
      </p>
    </div>
  );
}
