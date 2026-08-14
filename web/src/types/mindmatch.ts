// Mind Match : mini-jeu à deux où chacun tape un mot en secret, en essayant
// de converger sur le MÊME mot que son·sa partenaire — voir
// hooks/use-mindmatch-session.ts. Aucune BDD (comme le reste du MVP) : tout
// l'état vit en mémoire côté client pour la durée de la partie.

export type MindMatchPhase =
  // Salle d'attente, avant le lancement.
  | "lobby"
  // Manche en cours : chacun tape son mot pour l'essai courant, en secret
  // (je ne vois jamais le mot de mon·ma partenaire avant que les DEUX
  // l'aient soumis — voir "reveal").
  | "guessing"
  // Les deux mots de l'essai courant sont révélés : soit ils convergent
  // (manche gagnée), soit un nouvel essai démarre à partir de ce qu'on vient
  // de voir.
  | "reveal"
  // Toutes les manches jouées : carte récap, télécharger/partager/rejouer.
  | "recap";

export interface MindMatchRoundResult {
  round: number;
  /** Le mot sur lequel les deux se sont rejoint·es. */
  word: string;
  /** Nombre d'essais qu'il a fallu pour converger (1 = du premier coup). */
  attempts: number;
}

export interface MindMatchAttempt {
  attempt: number;
  myWord: string;
  peerWord: string;
  converged: boolean;
}
