"use client";

import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { DOODLE_COLORS } from "@/lib/capture/doodle";
import { cn } from "@/lib/utils";

interface DoodleToolbarProps {
  active: boolean;
  onToggle: () => void;
  color: string;
  onColorChange: (color: string) => void;
  onClear: () => void;
  hasStrokes: boolean;
}

// Barre discrète : le pinceau arme/désarme le dessin sur SA propre caméra
// (évite qu'un doigt qui traîne sur l'écran laisse un trait involontaire —
// opt-in explicite plutôt qu'un canvas toujours interactif). Couleurs et
// effacer n'apparaissent qu'une fois armé.
export function DoodleToolbar({ active, onToggle, color, onColorChange, onClear, hasStrokes }: DoodleToolbarProps) {
  const t = useTranslations("doodle");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
          active ? "bg-[#fb5a46] text-white" : "bg-white/10 text-white/80 hover:bg-white/15",
        )}
      >
        <Pencil className="size-3.5" />
        {t("toggle")}
      </button>

      {active && (
        <>
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1.5">
            {DOODLE_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={t("colorLabel")}
                aria-pressed={color === swatch}
                onClick={() => onColorChange(swatch)}
                className={cn(
                  "size-5 rounded-full ring-2 ring-offset-1 ring-offset-[#161319] transition",
                  color === swatch ? "ring-white" : "ring-transparent",
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={!hasStrokes}
            className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/15 disabled:opacity-30"
          >
            <Trash2 className="size-3.5" />
            {t("clear")}
          </button>
        </>
      )}
    </div>
  );
}
