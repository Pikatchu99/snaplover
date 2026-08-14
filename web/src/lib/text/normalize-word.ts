// Normalise un mot pour comparaison — casse, accents et espaces superflus ne
// doivent jamais faire échouer une égalité ("Sirene" == "sirène"). Partagé
// entre Doodle Duel (essai vs mot secret, voir lib/doodle-duel/pick-word.ts)
// et Mind Match (mot vs mot, voir hooks/use-mindmatch-session.ts) — même
// besoin exact dans les deux jeux.
export function normalizeWord(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function isSameWord(a: string, b: string): boolean {
  return normalizeWord(a) === normalizeWord(b);
}
