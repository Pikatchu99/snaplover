// Liste de mots français pour valider localement les essais d'Edge Letters
// (voir CLAUDE.md "Edge Letters" pour le choix de source/licence) — dérivée
// de "an-array-of-french-words" (MIT, voir french-word-list.LICENSE.txt),
// filtrée aux mots simples (pas de formes composées à trait d'union) et
// pré-normalisée (minuscules, sans accents) au moment de la génération —
// jamais renormalisée à l'exécution, `normalizeWord` suffit côté appelant.
//
// Chargée via import() dynamique, jamais en haut du fichier : ~4 Mo de JSON
// (compressé ~750 Ko), ça ne doit jamais alourdir le bundle d'une autre
// page — seule la première entrée en phase "racing" d'Edge Letters la
// déclenche (voir hooks/use-edge-letters-session.ts).
let cachedWordSet: Set<string> | null = null;

export async function loadFrenchWordSet(): Promise<Set<string>> {
  if (cachedWordSet) return cachedWordSet;
  const { default: words } = await import("@/lib/text/french-word-list.json");
  cachedWordSet = new Set(words);
  return cachedWordSet;
}
