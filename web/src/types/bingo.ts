// Bingo : symétrique dans le jeu (les deux génèrent une carte, la marquent,
// tentent de réclamer une ligne) mais asymétrique dans l'autorité pour une
// seule chose par manche : qui génère et rythme le tirage des numéros (voir
// hooks/use-bingo-session.ts). Aucune BDD (comme le reste du MVP).

export type BingoPhase = "lobby" | "calling" | "reveal" | "recap";

export type BingoLineType = "row" | "col" | "diag";

export interface BingoLineRef {
  type: BingoLineType;
  index: number;
}

// 25 cases (5x5), row-major — l'index 12 (ligne 2, colonne 2) est la case
// gratuite, toujours `null` (jamais un vrai numéro), toujours considérée
// comme satisfaite dans n'importe quelle ligne qui la contient.
export interface BingoCard {
  numbers: (number | null)[];
}

export type BingoWinner = "host" | "guest" | "draw";

export interface BingoRoundResult {
  round: number;
  winner: BingoWinner;
  lineType: BingoLineType;
  lineIndex: number;
}
