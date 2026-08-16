// Duo Quiz : questions de culture générale identiques des deux côtés
// (banque statique bilingue, voir lib/duo-quiz/question-bank.json), sans
// tour — les deux répondent au même instant, sans attendre l'autre (voir
// hooks/use-duo-quiz-session.ts). Aucune BDD (comme le reste du MVP).

export type DuoQuizPhase = "lobby" | "round" | "reveal" | "recap";

export interface DuoQuizRoundResult {
  roundIndex: number;
  questionId: string;
  hostCorrect: boolean;
  guestCorrect: boolean;
}
