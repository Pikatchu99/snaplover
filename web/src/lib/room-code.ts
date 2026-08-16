import { config } from "@/lib/config";
import { ROOM_KIND_PREFIX, type RoomKind } from "@/lib/games/registry";

export type { RoomKind };

// Code de room court et lisible — voir SNAPROOM-SPEC.md §7. Le premier
// caractère encode le type de room (photo/chaque mini-jeu — voir
// lib/games/registry.ts pour la table des préfixes) : sans ça, deux rooms de
// types différents pouvaient tomber sur le même code et entrer en collision
// côté signaling/ (une seule Map<code, RoomEntry>, aucune notion de type —
// voir signaling/src/server.ts) — et la landing ne pouvait pas savoir vers
// quelle route rediriger un code collé dans le champ générique "coller le
// lien / code" (voir InlineJoinField.tsx, qui redirigeait toujours vers /r/,
// même pour un code de duel).
const ROOM_CODE_RE = /^[A-Z0-9]{4,8}$/;

export function generateRoomCode(kind: RoomKind): string {
  const { charset, length } = config.roomCode;
  let code = ROOM_KIND_PREFIX[kind];
  for (let i = 1; i < length; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_RE.test(code.toUpperCase());
}

// Déduit le type de room à partir de son code (premier caractère) — utilisé
// par le champ générique de la landing pour rediriger vers la bonne route
// sans requête réseau (signaling/ n'a pas besoin de connaître le type).
// Retourne null si le format est invalide ou le préfixe inconnu (code d'un
// ancien format, avant cette convention — les rooms étant éphémères, aucun
// lien de ce genre n'a vocation à rester valide indéfiniment).
export function roomKindFromCode(code: string): RoomKind | null {
  const upper = code.trim().toUpperCase();
  if (!isValidRoomCode(upper)) return null;
  const match = (Object.entries(ROOM_KIND_PREFIX) as [RoomKind, string][]).find(([, prefix]) => prefix === upper[0]);
  return match ? match[0] : null;
}
