import { PACK_IDS, DEFAULT_PACK_ID, STICKER_PACKS } from "@/lib/stickers/sticker-registry";
import type { StickerId, StickerPackId } from "@/types/sticker";

export interface DailyChallenge {
  packId: StickerPackId;
  stickerIds: StickerId[];
}

// FNV-1a — hash de chaîne rapide et déterministe, seed pour le PRNG ci-dessous.
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// mulberry32 — PRNG seedé minimal, seule façon d'obtenir un tirage
// reproductible : Math.random() (utilisé par pick-stickers.ts) ne l'est pas.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Tire 3 stickers déterministes du pack donné, ré-enchaînant un nouveau
// shuffle seedé (même précaution que pickStickers) si le pool est plus petit
// que 3 — ne devrait jamais arriver vu la taille actuelle des packs, mais
// évite un pack cassé de renvoyer moins de 3 poses.
function pickDeterministic(packId: StickerPackId, random: () => number): StickerId[] {
  const pool = STICKER_PACKS[packId].stickerIds;
  const picked: StickerId[] = [];
  while (picked.length < 3) {
    picked.push(...seededShuffle(pool, random));
  }
  return picked.slice(0, 3);
}

// Pack + 3 stickers du jour, identiques pour tout le monde le même jour UTC —
// utilisé par la section "Pack du jour" de la landing (page.tsx, Server
// Component appelé à chaque requête, pas d'état à persister).
export function getDailyChallenge(date: Date = new Date()): DailyChallenge {
  const dayKey = date.toISOString().slice(0, 10);
  const random = mulberry32(hashString(dayKey));

  let packId = PACK_IDS[Math.floor(random() * PACK_IDS.length)];
  if (STICKER_PACKS[packId].stickerIds.length < 3) packId = DEFAULT_PACK_ID;

  return { packId, stickerIds: pickDeterministic(packId, random) };
}
