// Copy Cat : mimicry photobooth à deux, sans chrono nulle part (voir
// hooks/use-copy-cat-session.ts) — un·e poseur·se prend la pose sur sa
// propre caméra, l'autre la reproduit en s'aidant d'un calque fantôme semi-
// transparent. Aucune BDD (comme le reste du MVP).

export type CopyCatPhase = "lobby" | "posing" | "mimic-prep" | "reveal" | "recap";

export type CopyCatRole = "poser" | "mimic";

export type CopyCatVerdict = "nailed-it" | "close" | "not-quite";

export interface CopyCatRoundResult {
  round: number;
  referenceUrl: string;
  attemptUrl: string;
  verdict: CopyCatVerdict;
}
