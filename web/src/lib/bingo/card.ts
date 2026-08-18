import { config } from "@/lib/config";
import type { BingoCard } from "@/types/bingo";

// Génération de carte — 100% locale, JAMAIS transmise (voir CLAUDE.md
// "Bingo") : une carte n'est vue de personne d'autre que son·sa
// propriétaire, aucune incitation ni possibilité de tricher dessus. Seule
// ressource réellement partagée et contestée : l'ordre de tirage (voir
// draw-order.ts).
function shuffleColumnRange(min: number, max: number, count: number): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function generateCard(): BingoCard {
  const size = config.bingo.cardSize;
  const centerRow = Math.floor(size / 2);
  const centerCol = Math.floor(size / 2);
  const numbers: (number | null)[] = new Array(size * size).fill(null);

  config.bingo.columns.forEach((column, colIndex) => {
    const isCenterColumn = colIndex === centerCol;
    const rowsNeeded = isCenterColumn ? size - 1 : size;
    const picked = shuffleColumnRange(column.min, column.max, rowsNeeded);
    let pickedIndex = 0;
    for (let row = 0; row < size; row++) {
      if (isCenterColumn && row === centerRow) continue; // case gratuite, reste `null`
      numbers[row * size + colIndex] = picked[pickedIndex];
      pickedIndex += 1;
    }
  });

  return { numbers };
}
