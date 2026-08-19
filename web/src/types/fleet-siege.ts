// Fleet Siege : bataille navale classique à deux, grille 8x8, 3 navires
// chacun·e (voir lib/fleet-siege/board.ts, config.fleetSiege). Aucune BDD
// (comme le reste du MVP).

export type FleetSiegePhase = "lobby" | "placement" | "battle" | "reveal";

export type Orientation = "horizontal" | "vertical";

export interface ShipPlacement {
  id: string;
  length: number;
  row: number;
  col: number;
  orientation: Orientation;
}

export interface FleetSiegeCell {
  row: number;
  col: number;
}

export interface FleetSiegeSunkShip {
  id: string;
  cells: FleetSiegeCell[];
}

// Un tir que J'AI fait sur le plateau adverse — résultat reçu de la part du
// propriétaire de la flotte, jamais calculé localement (voir CLAUDE.md
// "Fleet Siege" : un seul côté connaît son propre plateau).
export interface OutgoingShot {
  shotIndex: number;
  row: number;
  col: number;
  result: "hit" | "miss";
  sunkShip?: FleetSiegeSunkShip;
}

// Un tir que l'ADVERSAIRE a fait sur MON plateau — calculé localement à
// partir de ma propre flotte, jamais transmis tant que la partie est en
// cours (seul le verdict traverse le réseau).
export interface IncomingShot {
  shotIndex: number;
  row: number;
  col: number;
  result: "hit" | "miss";
}
