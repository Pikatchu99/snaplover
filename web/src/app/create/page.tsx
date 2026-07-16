"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, LayoutGrid, Rows3 } from "lucide-react";
import { generateRoomCode } from "@/lib/room-code";
import { FRAME_IDS } from "@/lib/frames/frame-registry";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { fr } from "@/i18n/messages";
import { RoomPreview } from "@/components/landing/RoomPreview";
import type { FrameId, StripStyle } from "@/types/frame";

const STYLE_OPTIONS: { id: StripStyle; label: string; icon: typeof Rows3 }[] = [
  { id: "vertical", label: fr.create.styleVertical, icon: Rows3 },
  { id: "grid", label: fr.create.styleGrid, icon: LayoutGrid },
];

const PILL_CLASS = (active: boolean) =>
  cn(
    "flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition",
    active ? "border-[#1c1712] bg-[#1c1712] text-white" : "border-[#ece4d8] text-[#8c8378] hover:border-[#8c8378]",
  );

const CARD_CLASS = (active: boolean) =>
  cn(
    "flex flex-1 flex-col items-center gap-2 rounded-2xl border px-4 py-5 text-sm font-medium transition",
    active ? "border-[#1c1712] bg-[#1c1712] text-white" : "border-[#ece4d8] text-[#1c1712] hover:border-[#8c8378]",
  );

// Créer une room (E3) — SNAPROOM-SPEC.md §12. Aucune BDD au MVP : la config
// (poses/style/cadre) est encodée dans l'URL partagée (voir lib/room-config.ts).
export default function CreateRoomPage() {
  const router = useRouter();
  const [poses, setPoses] = useState<number>(config.roomConfig.defaultPoses);
  const [style, setStyle] = useState<StripStyle>("vertical");
  const [frameId, setFrameId] = useState<FrameId>("classic");

  async function handleCreate() {
    const code = generateRoomCode();
    const params = new URLSearchParams({ poses: String(poses), style, frame: frameId });
    const path = `/r/${code}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    } catch {
      // clipboard indisponible : on continue quand même vers la room
    }

    router.push(path);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#fbf7f1] px-6 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label={fr.create.back}
            className="flex size-9 items-center justify-center rounded-full border border-[#ece4d8] text-[#1c1712] transition hover:bg-[#ece4d8]/40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h1 className="font-heading text-xl font-bold text-[#1c1712]">{fr.create.title}</h1>
        </div>

        <RoomPreview poses={poses} style={style} frameId={frameId} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
            {fr.create.posesLabel}
          </legend>
          <div className="flex gap-2">
            {config.roomConfig.validPoses.map((n) => (
              <button key={n} onClick={() => setPoses(n)} className={PILL_CLASS(poses === n)}>
                {fr.create.posesOption(n)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
            {fr.create.styleLabel}
          </legend>
          <div className="flex gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button key={opt.id} onClick={() => setStyle(opt.id)} className={CARD_CLASS(style === opt.id)}>
                <opt.icon className="size-5" />
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
            {fr.create.frameLabel}
          </legend>
          <div className="flex gap-2">
            {FRAME_IDS.map((id) => (
              <button key={id} onClick={() => setFrameId(id)} className={PILL_CLASS(frameId === id)}>
                {fr.frames[id]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex-1" />

        <button
          onClick={handleCreate}
          className="w-full rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90"
        >
          {fr.create.submit}
        </button>
      </div>
    </main>
  );
}
