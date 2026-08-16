// Edge Letters : chaque manche, les deux joueur·euses choisissent CHACUN·E
// une lettre (l'un·e la lettre de DÉBUT, l'autre celle de FIN, rôle qui
// alterne par manche) et courent à taper un vrai mot français qui commence
// et se termine par ces deux lettres — voir hooks/use-edge-letters-session.ts.
// Aucune BDD (comme le reste du MVP).

export type EdgeLettersPhase = "lobby" | "picking" | "racing" | "reveal" | "recap";

export type EdgeLettersRole = "start" | "end";

export interface EdgeLettersRoundResult {
  round: number;
  startLetter: string;
  endLetter: string;
  /** null = match nul (personne n'a trouvé de mot valide à temps). */
  winner: "host" | "guest" | null;
  word: string | null;
}
