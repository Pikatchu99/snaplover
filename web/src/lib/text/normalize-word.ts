// Normalise un mot pour comparaison — casse, accents et espaces superflus ne
// doivent jamais faire échouer une égalité ("Sirene" == "sirène"). Partagé
// entre Doodle Duel (essai vs mot secret, voir lib/doodle-duel/pick-word.ts)
// et Word Sonar (mot vs mot / lettre vs lettre, voir
// hooks/use-word-sonar-session.ts) — même besoin exact dans les deux jeux.
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

// Positions (0-indexées) de chaque occurrence d'une lettre dans un mot,
// insensible à la casse/aux accents — voir hooks/use-word-sonar-session.ts
// ("as-tu telle lettre ?"). Tableau vide = lettre absente.
export function letterPositions(word: string, letter: string): number[] {
  const target = normalizeWord(letter);
  const positions: number[] = [];
  [...word].forEach((ch, i) => {
    if (normalizeWord(ch) === target) positions.push(i);
  });
  return positions;
}
