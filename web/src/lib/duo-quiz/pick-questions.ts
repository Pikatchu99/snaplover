import bank from "@/lib/duo-quiz/question-bank.json";

export interface DuoQuizQuestion {
  id: string;
  category: string;
  correctIndex: number;
  prompt: { fr: string; en: string };
  choices: { fr: string[]; en: string[] };
}

const QUESTION_BANK = bank as DuoQuizQuestion[];

// Banque publique et statique, identique dans les deux bundles (voir
// CLAUDE.md "Duo Quiz") : chaque côté peut toujours retrouver une question
// par son id, y compris `correctIndex` — la question/le choix ne sont donc
// JAMAIS transmis sur le réseau (contrairement à ce que suggérait la spec
// générée), seul l'id traverse `duoquiz-round-start`. Chaque client résout
// le texte affiché dans SA PROPRE locale (voir hooks/use-duo-quiz-session.ts)
// — nécessaire ici puisque ce jeu est bilingue (fr/en), contrairement à la
// spec générique qui supposait un texte unique envoyé verbatim.
export function findQuestion(id: string): DuoQuizQuestion | undefined {
  return QUESTION_BANK.find((question) => question.id === id);
}

// Fisher-Yates — jamais un `sort(() => Math.random() - 0.5)`, biaisé et
// connu pour l'être. Piochée UNIQUEMENT par l'hôte (seule autorité de manche
// pour toute la session, voir CLAUDE.md) : l'ordre n'a besoin d'être connu
// que de lui, jamais reproduit ni vérifié côté invité·e.
export function pickQuestionIds(count: number): string[] {
  const ids = QUESTION_BANK.map((question) => question.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, count);
}
