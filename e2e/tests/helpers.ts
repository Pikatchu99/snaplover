import type { Page } from "@playwright/test";

// Charset sans ambigus (voir web/src/lib/config.ts `roomCode`) — juste
// besoin de satisfaire la regex serveur `^[A-Z0-9]{4,8}$`, pas besoin de
// dépendre du package web pour ça.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// 5 caractères — même longueur que web/src/lib/config.ts `roomCode.length`,
// pour rester cohérent avec le champ code de /join (maxLength dérivé de la
// même config) si un test navigue par cette page.
export function randomRoomCode(length = 5): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

interface RoomParams {
  poses?: 3 | 4;
  frame?: string;
  style?: "vertical" | "grid";
  /** Un prénom est obligatoire pour entrer (voir app/r/[code]/page.tsx) —
   * défaut fourni ici pour les tests qui n'exercent pas la saisie du prénom. */
  name?: string;
}

export async function gotoRoom(page: Page, code: string, params?: RoomParams) {
  const query = new URLSearchParams();
  if (params?.poses) query.set("poses", String(params.poses));
  if (params?.frame) query.set("frame", params.frame);
  if (params?.style) query.set("style", params.style);
  query.set("name", params?.name ?? "Testeur");
  await page.goto(`/r/${code}?${query.toString()}`);
}

// Clique le bouton "Lancer la séance", qu'il soit visible côté page A ou B
// (seul l'hôte le voit — lequel des deux l'est dépend de l'ordre de connexion
// réel au signaling, pas déterministe depuis le test).
export async function launchSession(a: Page, b: Page) {
  const launchA = a.getByRole("button", { name: "Lancer la séance" });
  if (await launchA.isVisible().catch(() => false)) {
    await launchA.click();
    return;
  }
  await b.getByRole("button", { name: "Lancer la séance" }).click();
}
