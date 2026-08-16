// Word Sonar : mini-jeu à deux façon bataille navale de mots — chacun·e
// choisit un mot secret d'une longueur convenue, puis se pose des questions
// À L'ORAL (via la caméra/micro déjà branchés, voir components/room/
// FaceBubbles.tsx) pour deviner le mot de l'autre : "as-tu telle lettre ?",
// "à quelle position ?" — tout ça se passe en dehors de l'app, qui n'est
// qu'un carnet de notes personnel (voir hooks/use-word-sonar-session.ts).
// Partie unique du début à la fin, PAS de manches (retour utilisateur après
// un premier test réel — la première version avait 3 manches avec un mot
// neuf à chaque fois, ce n'était pas le jeu réellement joué). Aucune BDD
// (comme le reste du MVP) : tout l'état vit en mémoire côté client — le mot
// secret de chacun·e ne quitte JAMAIS son propre appareil tant que la
// partie n'est pas terminée.

export type WordSonarPhase =
  // Salle d'attente : l'hôte choisit la longueur du mot et lance la partie.
  | "lobby"
  // Chacun·e tape son mot secret (de la longueur convenue).
  | "picking"
  // Les deux mots sont posés : la vraie conversation ("as-tu telle lettre ?")
  // se passe à l'oral, l'app se contente d'un carnet de notes personnel et
  // d'une tentative de mot entier, possible à tout moment.
  | "playing"
  // Partie terminée (mot deviné, ou temps écoulé sur une connexion relayée) :
  // les deux mots sont révélés des deux côtés, carte récap.
  | "ended";

export type WordSonarOutcome = "won" | "lost" | "draw";

export interface WordSonarResult {
  outcome: WordSonarOutcome;
  /** Toujours connu immédiatement (mon propre mot). */
  myWord: string;
  /** null jusqu'à réception du message de révélation de l'autre côté — voir
   * "wordsonar-reveal" dans types/word-sonar-realtime.ts. */
  peerWord: string | null;
}
