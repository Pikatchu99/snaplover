import { config } from "@/lib/config";

// Tirage complet 1-75, mélangé — généré UNE SEULE FOIS par manche, par le·la
// donneur·se de numéros uniquement (voir hooks/use-bingo-session.ts). Une
// fois engagé (voir lib/bingo/commit.ts), diffusé un numéro à la fois,
// jamais régénéré ni réordonné en cours de manche.
export function shuffle75(): number[] {
  const pool = Array.from({ length: config.bingo.maxDraws }, (_, index) => index + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// Position (0-indexée) dans le journal des numéros appelés à laquelle le
// DERNIER numéro d'une ligne est tombé — donc l'instant précis où cette
// ligne est devenue complète. Retourne -1 si un numéro de la ligne n'a
// jamais été appelé (réclamation invalide, voir CLAUDE.md "Bingo").
export function completingIndex(calledNumbers: readonly number[], numbers: readonly number[]): number {
  let maxIndex = -1;
  for (const value of numbers) {
    const index = calledNumbers.indexOf(value);
    if (index === -1) return -1;
    maxIndex = Math.max(maxIndex, index);
  }
  return maxIndex;
}
