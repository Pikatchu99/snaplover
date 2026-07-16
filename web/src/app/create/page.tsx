"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { generateRoomCode } from "@/lib/room-code";
import { FRAME_IDS } from "@/lib/frames/frame-registry";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { fr } from "@/i18n/messages";
import type { FrameId, StripStyle } from "@/types/frame";

const STYLE_OPTIONS: { id: StripStyle; label: string }[] = [
  { id: "vertical", label: fr.create.styleVertical },
  { id: "grid", label: fr.create.styleGrid },
];

const OPTION_BUTTON_CLASS = (active: boolean) =>
  cn(
    "flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition",
    active ? "border-[#fb5a46] bg-[#fb5a46]/10 text-[#1c1712]" : "border-[#ece4d8] text-[#8c8378] hover:border-[#8c8378]",
  );

// Créer une room (E3) — SNAPROOM-SPEC.md §12. Aucune BDD au MVP : la config
// (poses/style/cadre) est encodée dans l'URL partagée (voir lib/room-config.ts).
export default function CreateRoomPage() {
  const router = useRouter();
  const [poses, setPoses] = useState<number>(config.roomConfig.defaultPoses);
  const [style, setStyle] = useState<StripStyle>("vertical");
  const [frameId, setFrameId] = useState<FrameId>("classic");
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    const code = generateRoomCode();
    const params = new URLSearchParams({ poses: String(poses), style, frame: frameId });
    const path = `/r/${code}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
    } catch {
      // clipboard indisponible : on continue quand même vers la room
    }

    router.push(path);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fbf7f1] px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-[#1c1712]">{fr.create.title}</h1>

      <div className="flex w-full max-w-md flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-[#1c1712]">{fr.create.posesLabel}</legend>
          <div className="flex gap-2">
            {config.roomConfig.validPoses.map((n) => (
              <button key={n} onClick={() => setPoses(n)} className={OPTION_BUTTON_CLASS(poses === n)}>
                {fr.create.posesOption(n)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-[#1c1712]">{fr.create.styleLabel}</legend>
          <div className="flex gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button key={opt.id} onClick={() => setStyle(opt.id)} className={OPTION_BUTTON_CLASS(style === opt.id)}>
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-[#1c1712]">{fr.create.frameLabel}</legend>
          <div className="flex gap-2">
            {FRAME_IDS.map((id) => (
              <button key={id} onClick={() => setFrameId(id)} className={OPTION_BUTTON_CLASS(frameId === id)}>
                {fr.frames[id]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button
        onClick={handleCreate}
        className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {fr.create.submit}
      </button>
    </main>
  );
}
