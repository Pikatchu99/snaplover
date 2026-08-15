// Word Sonar : mini-jeu à deux façon bataille navale de mots — chacun choisit
// un mot secret d'une longueur convenue, puis on alterne : "as-tu telle
// lettre ?" (si oui, position(s) révélée(s)) ou une tentative de deviner le
// mot entier. Voir hooks/use-word-sonar-session.ts. Aucune BDD (comme le
// reste du MVP) : tout l'état vit en mémoire côté client pour la durée de la
// partie — le mot secret de chacun·e ne quitte JAMAIS son propre appareil (la
// réponse à une question est calculée localement par qui répond, jamais
// transmise en clair).

export type WordSonarPhase =
  // Salle d'attente : l'hôte choisit la longueur du mot et lance la partie.
  | "lobby"
  // Chacun·e tape son mot secret (de la longueur convenue) — manche en cours,
  // mais personne n'a encore commencé à interroger l'autre.
  | "picking"
  // Les deux mots sont posés : on alterne question (lettre) ou tentative
  // (mot entier) jusqu'à ce qu'un côté devine le mot de l'autre.
  | "playing"
  // Manche terminée (mot deviné) : résultat affiché des deux côtés.
  | "reveal"
  // Toutes les manches jouées : carte récap, télécharger/partager/rejouer.
  | "recap";

export interface WordSonarEvent {
  /** true si c'est MOI qui avais la main pour cet événement. */
  askerIsMe: boolean;
  kind: "letter" | "guess" | "skip";
  /** kind === "letter" */
  letter?: string;
  positions?: number[];
  /** kind === "guess" */
  word?: string;
  correct?: boolean;
}

export interface WordSonarRoundResult {
  round: number;
  /** true si c'est MOI qui ai deviné le mot de mon·ma partenaire. */
  iWon: boolean;
  /** Le mot qui vient d'être deviné (le mien si j'ai perdu, celui de
   * mon·ma partenaire si j'ai gagné). */
  word: string;
  turns: number;
}
