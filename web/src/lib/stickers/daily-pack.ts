import { PACK_IDS, STICKER_PACKS, STICKERS } from "@/lib/stickers/sticker-registry";
import { DAILY_ROTATION_PACK_IDS, FEATURED_STICKER_IDS } from "@/lib/stickers/featured-stickers";
import { DAILY_PACK_OVERRIDES } from "@/lib/stickers/daily-pack-overrides";
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

// Tire 3 stickers déterministes du pool donné, ré-enchaînant un nouveau
// shuffle seedé (même précaution que pickStickers) si le pool est plus petit
// que 3 — ne devrait jamais arriver vu la taille actuelle des packs, mais
// évite un pack cassé de renvoyer moins de 3 poses.
function pickDeterministic(pool: StickerId[], random: () => number): StickerId[] {
  const picked: StickerId[] = [];
  while (picked.length < 3) {
    picked.push(...seededShuffle(pool, random));
  }
  return picked.slice(0, 3);
}

// Ne garde que les ids qui existent vraiment et appartiennent bien au pack
// donné — une faute de frappe dans la curation/l'override ne doit jamais
// casser la landing, juste être ignorée au profit du tirage habituel.
function validIdsForPack(packId: StickerPackId, ids: StickerId[]): StickerId[] {
  return ids.filter((id) => STICKERS[id]?.packId === packId);
}

// Pack + 3 stickers du jour, identiques pour tout le monde le même jour UTC —
// utilisé par la section "Pack du jour" de la landing (page.tsx, Server
// Component appelé à chaque requête, pas d'état à persister).
export function getDailyChallenge(date: Date = new Date()): DailyChallenge {
  const dayKey = date.toISOString().slice(0, 10);

  // Override manuel (daily-pack-overrides.ts) : prioritaire s'il est valide
  // pour cette date précise, sinon on retombe sur le tirage déterministe.
  const override = DAILY_PACK_OVERRIDES[dayKey];
  if (override) {
    const validOverrideIds = validIdsForPack(override.packId, override.stickerIds);
    if (validOverrideIds.length === 3) return { packId: override.packId, stickerIds: validOverrideIds };
  }

  const random = mulberry32(hashString(dayKey));
  // Rotation restreinte (DAILY_ROTATION_PACK_IDS) si configurée, sinon tous
  // les packs — vide = pas de casse silencieuse.
  const rotationPool = DAILY_ROTATION_PACK_IDS.length > 0 ? DAILY_ROTATION_PACK_IDS : PACK_IDS;
  let packId = rotationPool[Math.floor(random() * rotationPool.length)];
  if (STICKER_PACKS[packId].stickerIds.length < 3) packId = rotationPool[0];

  // Pool curé (featured-stickers.ts) en priorité s'il a au moins 3 entrées
  // valides pour ce pack, sinon pack complet (comportement d'avant la
  // curation, garde-fou si le pool curé est encore vide/insuffisant).
  const curatedPool = validIdsForPack(packId, FEATURED_STICKER_IDS[packId] ?? []);
  const pool = curatedPool.length >= 3 ? curatedPool : STICKER_PACKS[packId].stickerIds;

  return { packId, stickerIds: pickDeterministic(pool, random) };
}
