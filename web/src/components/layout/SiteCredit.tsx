"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { fr } from "@/i18n/messages";
import { trackLike } from "@/lib/analytics";

const REPO_URL = "https://github.com/Pikatchu99/snaplover";

// Crédit auteur + liens contribution, visible sur toutes les pages (voir
// app/layout.tsx). Barre fixe compacte, fond sombre translucide pour rester
// lisible aussi bien sur les écrans clairs (landing/create/join) que sombres
// (lobby/séance) sans avoir à connaître le thème de la page qui l'affiche.
export function SiteCredit() {
  const [liked, setLiked] = useState<Record<"experience" | "app", boolean>>({
    experience: false,
    app: false,
  });

  function handleLike(kind: "experience" | "app") {
    if (liked[kind]) return;
    trackLike(kind);
    setLiked((prev) => ({ ...prev, [kind]: true }));
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-black/70 px-3 py-1 text-center text-[11px] text-white/80 backdrop-blur-sm sm:py-1.5">
      {/* Mobile : une seule ligne compacte, pas de boutons "j'aime" — sur un petit
          écran cette barre empiétait sur les CTA en bas de page (ex. "Lancer" du
          lobby) malgré le padding réservé plus haut dans les pages. */}
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block truncate font-medium text-white hover:underline sm:hidden"
      >
        {fr.siteCredit.credit}
      </a>
      <div className="hidden flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:flex">
        <span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-white hover:underline">
            {fr.siteCredit.credit}
          </a>{" "}
          · {fr.siteCredit.contribute}
        </span>
        <span className="flex items-center gap-2">
          <button
            onClick={() => handleLike("experience")}
            disabled={liked.experience}
            className="flex items-center gap-1 rounded-full border border-white/20 px-2 py-0.5 transition hover:bg-white/10 disabled:opacity-60"
          >
            <Heart className={`size-3 ${liked.experience ? "fill-[#fb5a46] text-[#fb5a46]" : ""}`} />
            {fr.siteCredit.likeExperience}
          </button>
          <button
            onClick={() => handleLike("app")}
            disabled={liked.app}
            className="flex items-center gap-1 rounded-full border border-white/20 px-2 py-0.5 transition hover:bg-white/10 disabled:opacity-60"
          >
            <Heart className={`size-3 ${liked.app ? "fill-[#fb5a46] text-[#fb5a46]" : ""}`} />
            {fr.siteCredit.likeApp}
          </button>
        </span>
      </div>
    </div>
  );
}
