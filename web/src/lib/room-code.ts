import { config } from "@/lib/config";

// Code de room court et lisible — voir SNAPROOM-SPEC.md §7.
const ROOM_CODE_RE = /^[A-Z0-9]{4,8}$/;

export function generateRoomCode(): string {
  const { charset, length } = config.roomCode;
  let code = "";
  for (let i = 0; i < length; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_RE.test(code.toUpperCase());
}
