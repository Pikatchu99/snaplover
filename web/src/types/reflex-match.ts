// Reflex Match : course de réflexes à deux — à chaque manche, une grille
// 3x3 de formes identiques révélée au MÊME instant des deux côtés
// (horloge synchronisée, voir hooks/use-reflex-match-session.ts), une
// seule case "différente" à repérer et taper en premier. Aucune BDD
// (comme le reste du MVP).

export type ReflexPhase = "lobby" | "pending" | "active" | "result" | "recap";

export type ReflexShape = "circle" | "square" | "triangle" | "diamond" | "star";

export interface ReflexCell {
  shape: ReflexShape;
  hue: number;
  rotationDeg: number;
  /** Petite encoche découpée dans la forme — une des trois façons possibles
   * de rendre la case impaire différente (voir lib/reflex-match/generate-round.ts). */
  notch: boolean;
}

export interface ReflexRound {
  cells: ReflexCell[];
  oddIndex: number;
}

export type ReflexWinner = "host" | "guest" | "draw";

export interface ReflexRoundResult {
  round: number;
  winner: ReflexWinner;
  hostTapAt: number | null;
  guestTapAt: number | null;
  oddIndex: number;
}
