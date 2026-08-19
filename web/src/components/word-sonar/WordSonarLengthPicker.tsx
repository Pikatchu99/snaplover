"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { config } from "@/lib/config";

interface WordSonarLengthPickerProps {
  onLaunch: (length: number) => void;
  disabled?: boolean;
}

// Réglage de la longueur de mot (hôte uniquement) — utilisé à la fois dans
// la salle d'attente initiale (WordSonarLobby.tsx) et pour "Rejouer" en
// cours de partie (WordSonarRoundStage.tsx, phase "lobby") : deuxième
// appelant réel, extrait à cette occasion plutôt que dupliqué.
export function WordSonarLengthPicker({ onLaunch, disabled }: WordSonarLengthPickerProps) {
  const t = useTranslations("wordSonarLobby");
  const [length, setLength] = useState<number>(config.wordSonar.defaultLength);

  return (
    <div className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between text-sm text-white/80">
        <span>{t("lengthLabel")}</span>
        <span className="font-mono text-lg font-bold text-white">{length}</span>
      </div>
      <input
        type="range"
        min={config.wordSonar.minLength}
        max={config.wordSonar.maxLength}
        value={length}
        onChange={(event) => setLength(Number(event.target.value))}
        className="w-full accent-[#fb5a46]"
      />
      <button
        onClick={() => onLaunch(length)}
        disabled={disabled}
        className="w-full rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90 disabled:from-white/15 disabled:to-white/15 disabled:text-white/50"
      >
        {t("launch")}
      </button>
    </div>
  );
}
