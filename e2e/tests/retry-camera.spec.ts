import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode, gotoRoom, launchSession } from "./helpers";

const LAUNCH_BUTTON = { name: "Lancer la séance" };

async function isHost(page: Page): Promise<boolean> {
  return page.getByRole("button", LAUNCH_BUTTON).isVisible().catch(() => false);
}

// Régression : "Reprendre" doit (1) redemander un vrai flux caméra — celui
// d'avant a été coupé (track.stop()) en arrivant sur le résultat — et (2) ne
// jamais rejouer le tirage hôte/invité au signaling, seulement remplacer les
// pistes de la connexion WebRTC déjà établie (voir RoomClient.tsx,
// use-room-connection.ts, peer-connection.ts::replaceLocalStream).
test("reprendre → caméra locale revient, rôle hôte/invité inchangé", async ({ browser }) => {
  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await gotoRoom(a, room, { poses: 3 });
  await gotoRoom(b, room);

  await expect(a.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });

  const aWasHost = await isHost(a);
  const bWasHost = await isHost(b);
  expect(aWasHost).not.toBe(bWasHost);

  await launchSession(a, b);

  await expect(a.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });
  await expect(b.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });

  await a.getByRole("button", { name: "Reprendre" }).click();
  await expect(a.getByText("Salle d'attente")).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText("Salle d'attente")).toBeVisible({ timeout: 10_000 });

  // Le rôle hôte/invité de chaque onglet doit être exactement le même qu'avant.
  expect(await isHost(a)).toBe(aWasHost);
  expect(await isHost(b)).toBe(bWasHost);

  // La caméra locale (première tuile) doit vraiment recevoir des images, pas
  // juste afficher un état "prêt" déconnecté du flux réel.
  await expect
    .poll(async () => a.locator("video").first().evaluate((v: HTMLVideoElement) => v.videoWidth > 0 && v.videoHeight > 0), {
      timeout: 10_000,
    })
    .toBe(true);
  await expect
    .poll(async () => b.locator("video").first().evaluate((v: HTMLVideoElement) => v.videoWidth > 0 && v.videoHeight > 0), {
      timeout: 10_000,
    })
    .toBe(true);

  await contextA.close();
  await contextB.close();
});
