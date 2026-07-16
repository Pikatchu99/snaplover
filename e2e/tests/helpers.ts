import type { Page } from "@playwright/test";

// Charset sans ambigus (voir web/src/lib/config.ts `roomCode`) — juste
// besoin de satisfaire la regex serveur `^[A-Z0-9]{4,8}$`, pas besoin de
// dépendre du package web pour ça.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomRoomCode(length = 6): string {
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
}

export async function gotoRoom(page: Page, code: string, params?: RoomParams) {
  const query = new URLSearchParams();
  if (params?.poses) query.set("poses", String(params.poses));
  if (params?.frame) query.set("frame", params.frame);
  if (params?.style) query.set("style", params.style);
  const qs = query.toString();
  await page.goto(`/r/${code}${qs ? `?${qs}` : ""}`);
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
