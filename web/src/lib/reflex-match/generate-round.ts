import { createPrng } from "@/lib/reflex-match/prng";
import type { ReflexCell, ReflexRound, ReflexShape } from "@/types/reflex-match";

// UNE SEULE implémentation, importée des deux côtés — jamais réécrite
// indépendamment par client (voir CLAUDE.md "Reflex Match") : un ordre de
// tirage différent dans le PRNG désynchroniserait silencieusement quelle
// case est "la bonne", même avec un seed identique. Grille fixe 9 cases
// (pas de montée en taille en v1, voir CLAUDE.md) : 8 cases partagent
// exactement forme+teinte+rotation, la case impaire diffère sur UNE SEULE
// propriété (rotation, teinte, ou encoche ajoutée) — un vrai écart, mais
// jamais trivial à repérer d'un coup d'œil.
const SHAPES: readonly ReflexShape[] = ["circle", "square", "triangle", "diamond", "star"];
const GRID_SIZE = 9;

export function generateRound(seed: number): ReflexRound {
  const rng = createPrng(seed);
  const shape = SHAPES[Math.floor(rng() * SHAPES.length)];
  const hue = Math.floor(rng() * 360);
  const rotationDeg = Math.floor(rng() * 360);
  const oddIndex = Math.floor(rng() * GRID_SIZE);
  const variation = Math.floor(rng() * 3);

  const cells: ReflexCell[] = Array.from({ length: GRID_SIZE }, (_, index): ReflexCell => {
    if (index !== oddIndex) return { shape, hue, rotationDeg, notch: false };
    if (variation === 0) return { shape, hue, rotationDeg: (rotationDeg + 25 + Math.floor(rng() * 15)) % 360, notch: false };
    if (variation === 1) return { shape, hue: (hue + 15 + Math.floor(rng() * 5)) % 360, rotationDeg, notch: false };
    return { shape, hue, rotationDeg, notch: true };
  });

  return { cells, oddIndex };
}
