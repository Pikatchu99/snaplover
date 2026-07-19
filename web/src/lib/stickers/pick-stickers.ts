import { STICKER_PACKS } from "@/lib/stickers/sticker-registry";
import type { StickerId, StickerPackId } from "@/types/sticker";

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Tire `count` stickers du pack, sans répétition immédiate. Si `count`
// dépasse la taille du pack, ré-enchaîne un nouveau tirage mélangé plutôt que
// de répéter la même liste triée (qui donnerait toujours le même schéma de
// répétition à chaque tour).
export function pickStickers(packId: StickerPackId, count: number): StickerId[] {
  const pool = STICKER_PACKS[packId].stickerIds;
  const picked: StickerId[] = [];
  while (picked.length < count) {
    picked.push(...shuffle(pool));
  }
  return picked.slice(0, count);
}
