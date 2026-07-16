interface StripPreviewProps {
  cells?: number;
  caption?: string;
  className?: string;
  /**
   * Photos réelles, une paire par case : images[i*2] = moitié gauche,
   * images[i*2+1] = moitié droite. Retombe sur un aplat de couleur tant
   * qu'aucune image n'est fournie pour une case.
   */
  images?: string[];
}

// Visuel de bande photo (landing) — chaque case = 2 photos côte à côte,
// comme les vraies cases (hôte / invité).
export function StripPreview({ cells = 3, caption = "SNAPROOM · JUL 14", className, images }: StripPreviewProps) {
  return (
    <div className={`w-40 rounded-2xl border border-[#ece4d8] bg-white p-2 shadow-sm ${className ?? ""}`}>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: cells }).map((_, i) => {
          const left = images?.[i * 2];
          const right = images?.[i * 2 + 1];
          return (
            <div key={i} className="flex h-20 gap-1.5 overflow-hidden rounded-lg">
              {left ? (
                // eslint-disable-next-line @next/next/no-img-element -- décoratif, pas de source Next/Image configurée
                <img src={left} alt="" className="h-full flex-1 object-cover" />
              ) : (
                <div className="flex-1 bg-[#ffb787]" />
              )}
              {right ? (
                // eslint-disable-next-line @next/next/no-img-element -- décoratif, pas de source Next/Image configurée
                <img src={right} alt="" className="h-full flex-1 object-cover" />
              ) : (
                <div className="flex-1 bg-[#b9c2f7]" />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] tracking-[0.15em] text-[#8c8378]">{caption}</p>
    </div>
  );
}
