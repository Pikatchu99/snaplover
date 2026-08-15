import { DUEL_WORDS_FR, DUEL_WORDS_EN } from "@/lib/doodle-duel/words";
import { isSameWord } from "@/lib/text/normalize-word";

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

export function isCorrectGuess(guess: string, word: string): boolean {
  return isSameWord(guess, word);
}
