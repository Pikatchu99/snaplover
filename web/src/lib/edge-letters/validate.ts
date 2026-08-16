import { normalizeWord } from "@/lib/text/normalize-word";

// Validation LOCALE d'une tentative Edge Letters — appelée AVANT tout envoi
// réseau, des deux côtés (voir CLAUDE.md "Edge Letters" : contrairement à
// Word Sonar, aucun mot secret à protéger ici, donc une tentative invalide
// ne coûte rien et ne transite jamais sur le réseau). L'arbitre de la
// manche revalide quand même EXACTEMENT la même fonction avant de créditer
// toute tentative reçue (jamais confiance aveugle en un client modifié).
export function isValidEdgeLettersWord(
  word: string,
  startLetter: string,
  endLetter: string,
  wordSet: Set<string>,
): boolean {
  const normalized = normalizeWord(word);
  if (normalized.length < 2) return false;
  if (normalized[0] !== normalizeWord(startLetter)) return false;
  if (normalized[normalized.length - 1] !== normalizeWord(endLetter)) return false;
  return wordSet.has(normalized);
}
