import { DUEL_WORDS_FR, DUEL_WORDS_EN } from "@/lib/doodle-duel/words";

function wordsForLocale(locale: string): readonly string[] {
  return locale === "en" ? DUEL_WORDS_EN : DUEL_WORDS_FR;
}

// Tire un mot au hasard, jamais déjà utilisé dans la partie en cours (`used`)
// — sinon une manche pourrait retomber sur le mot d'une manche précédente.
export function pickWord(locale: string, used: readonly string[]): string {
  const pool = wordsForLocale(locale).filter((word) => !used.includes(word));
  const candidates = pool.length > 0 ? pool : wordsForLocale(locale);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Normalise pour comparer un essai au mot secret : casse, accents et espaces
// superflus ne doivent jamais faire échouer une bonne réponse ("Sirene" ==
// "sirène").
export function normalizeGuess(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function isCorrectGuess(guess: string, word: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(word);
}
