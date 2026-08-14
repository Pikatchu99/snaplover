import type { DoodleStroke } from "@/types/doodle";

// Doodle Duel : mini-jeu Pictionary à deux, voir hooks/use-duel-session.ts.
// Aucune BDD (comme le reste du MVP) : tout l'état vit en mémoire côté
// client pour la durée de la partie, jamais persisté.

export type DuelPhase =
  // Salle d'attente, avant le lancement.
  | "lobby"
  // Manche en cours, je suis le·la dessinateur·rice : je vois le mot, pas
  // encore lancé mon chrono (voir "Dessiner !" — jamais de pression de temps
  // surprise, leçon du placement raté de Duo Doodle sur le 3·2·1).
  | "drawer-prep"
  // Manche en cours, chrono lancé — dessin (moi) ou lecture+essais (mon
  // partenaire) selon `isMyTurnToDraw` (voir hooks/use-duel-session.ts) :
  // même valeur de phase des deux côtés, l'UI seule distingue les deux rôles.
  | "drawing"
  // Manche terminée : mot révélé, dessin final visible des deux côtés.
  | "reveal"
  // Toutes les manches jouées : carte récap, télécharger/partager/rejouer.
  | "recap";

export interface DuelRoundResult {
  round: number;
  word: string;
  /** true si l'hôte (isInitiator) a dessiné cette manche, false si l'invité·e. */
  drawerIsInitiator: boolean;
  guessed: boolean;
  /** Temps écoulé avant la bonne réponse, ou la durée complète si pas deviné. */
  timeMs: number;
  /** Dessin final de la manche — normalisé [0,1]x[0,1], voir lib/capture/doodle.ts. */
  strokes: DoodleStroke[];
}
