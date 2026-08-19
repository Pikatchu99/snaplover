// Schéma d'engagement puis révélation (commit-then-reveal) — voir CLAUDE.md
// "Bingo" pour le raisonnement complet. Le·la donneur·se de numéros connaît
// déjà sa propre carte avant de générer le tirage partagé des 75 numéros ;
// sans garde-fou, iel pourrait favoriser silencieusement ses propres
// numéros. Révéler l'ordre complet AVANT la fin de la manche laisserait
// deviner quels numéros futurs complètent quelle ligne, permettant de
// chronométrer artificiellement la réclamation — donc l'ordre reste secret
// jusqu'à la fin, mais engagé cryptographiquement dès le départ pour que
// toute déviation soit détectable après coup (résistance aux préimages de
// SHA-256 : impossible de fabriquer rétroactivement un salt+séquence qui
// correspond à un hash déjà publié).
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function computeCommitHash(salt: string, sequence: readonly number[]): Promise<string> {
  return sha256Hex(`${salt}${sequence.join(",")}`);
}

// Vérifie, une fois la séquence complète révélée, que le hash recalculé
// correspond bien à l'engagement reçu AVANT le premier numéro appelé —
// jamais l'inverse (on ne fait jamais confiance à la séquence révélée
// seule, sans la comparer au hash déjà engagé).
export async function verifyCommitHash(salt: string, sequence: readonly number[], expectedHash: string): Promise<boolean> {
  const hash = await computeCommitHash(salt, sequence);
  return hash === expectedHash;
}
