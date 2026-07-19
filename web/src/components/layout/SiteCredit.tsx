"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { trackLike } from "@/lib/analytics";

// Boutons "j'aime" (feedback utilisateur), visibles sur toutes les pages (voir
// app/[locale]/layout.tsx). Barre fixe compacte, fond sombre translucide pour
// rester lisible aussi bien sur les écrans clairs (landing/create/join) que
// sombres (lobby/séance) sans avoir à connaître le thème de la page qui l'affiche.
export function SiteCredit() {
  const t = useTranslations("siteCredit");
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
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-2 bg-black/70 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm sm:py-1.5">
      <button
        onClick={() => handleLike("experience")}
        disabled={liked.experience}
        className="flex items-center gap-1 rounded-full border border-white/20 px-2 py-0.5 transition hover:bg-white/10 disabled:opacity-60"
      >
        <Heart className={`size-3 ${liked.experience ? "fill-[#fb5a46] text-[#fb5a46]" : ""}`} />
        {t("likeExperience")}
      </button>
      <button
        onClick={() => handleLike("app")}
        disabled={liked.app}
        className="flex items-center gap-1 rounded-full border border-white/20 px-2 py-0.5 transition hover:bg-white/10 disabled:opacity-60"
      >
        <Heart className={`size-3 ${liked.app ? "fill-[#fb5a46] text-[#fb5a46]" : ""}`} />
        {t("likeApp")}
      </button>
    </div>
  );
}
