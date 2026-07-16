interface PhotoStripProps {
  stripUrl: string;
}

// Résultat minimal (E6) : bande composée + téléchargement. Cadres/thèmes,
// filtres et partage viennent au jalon suivant (SNAPROOM-SPEC.md §17, J4).
export function PhotoStrip({ stripUrl }: PhotoStripProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#161319] px-4 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm text-white/60">C&apos;est dans la boîte</p>
        <h1 className="font-heading text-2xl font-bold text-white">Votre bande est prête</h1>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client, next/image ne s'applique pas */}
      <img src={stripUrl} alt="Bande photo composée" className="max-h-[70vh] rounded-lg border border-white/10" />

      <a
        href={stripUrl}
        download="snaproom.png"
        className="rounded-full bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
      >
        Télécharger PNG
      </a>
    </div>
  );
}
