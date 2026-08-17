// PRNG déterministe (mulberry32) — jamais Math.random() une fois la graine
// tirée : les deux côtés doivent reconstruire EXACTEMENT la même grille à
// partir du même seed (voir lib/reflex-match/generate-round.ts), seul le
// seed lui-même (un entier 32 bits) traverse le réseau.
export function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
