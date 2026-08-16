// Connect Duo : Puissance 4 à deux — aucune information cachée, aucun
// hasard, tout est public et se déduit du même log de coups partagé des
// deux côtés (voir lib/connect-duo/board.ts et
// hooks/use-connect-duo-session.ts). Aucune BDD (comme le reste du MVP).

export type ConnectDuoPhase = "playing" | "ended";
