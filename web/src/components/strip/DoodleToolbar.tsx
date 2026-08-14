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

// Barre discrète sous la bande composée (voir PhotoStrip.tsx) : le pinceau
// arme/désarme le dessin (opt-in explicite, évite un trait involontaire au
// premier tap sur l'image). Couleurs et effacer n'apparaissent qu'une fois armé.
export function DoodleToolbar({ active, onToggle, color, onColorChange, onClear, hasStrokes }: DoodleToolbarProps) {
  const t = useTranslations("doodle");

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition",
          active ? "bg-[#1c1712] text-white" : "border border-[#ece4d8] text-[#1c1712] hover:bg-[#ece4d8]/40",
        )}
      >
        <Pencil className="size-3.5" />
        {t("toggle")}
      </button>

      {active && (
        <>
          <div className="flex items-center gap-1.5 rounded-full border border-[#ece4d8] px-2 py-1.5">
            {DOODLE_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={t("colorLabel")}
                aria-pressed={color === swatch}
                onClick={() => onColorChange(swatch)}
                className={cn(
                  "size-5 rounded-full ring-2 ring-offset-1 ring-offset-[#fbf7f1] transition",
                  color === swatch ? "ring-[#1c1712]" : "ring-transparent",
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={!hasStrokes}
            className="flex items-center gap-1 rounded-full border border-[#ece4d8] px-3 py-1.5 text-sm font-medium text-[#8c8378] transition hover:bg-[#ece4d8]/40 disabled:opacity-30"
          >
            <Trash2 className="size-3.5" />
            {t("clear")}
          </button>
        </>
      )}
    </div>
  );
}
