import { test, expect } from "@playwright/test";
import { randomRoomCode, gotoRoom, launchSession } from "./helpers";

// Flux nominal : connexion des deux pairs, séance complète, changement de
// filtre, Reprendre — voir SNAPROOM-SPEC.md §12 (E4-E6).
test("connexion → séance → bande composée → filtre → reprendre", async ({ browser }) => {
  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await gotoRoom(a, room, { poses: 3, frame: "classic", style: "vertical" });
  await gotoRoom(b, room);

  await expect(a.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });

  await launchSession(a, b);

  await expect(a.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });
  await expect(b.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });

  const stripImage = a.locator('img[alt="Bande photo composée"]');
  const initialSrc = await stripImage.getAttribute("src");

  await a.getByRole("button", { name: "N&B" }).click();
  await expect
    .poll(async () => stripImage.getAttribute("src"), { timeout: 10_000 })
    .not.toBe(initialSrc);

  await a.getByRole("button", { name: "Reprendre" }).click();
  await expect(a.getByText("Salle d'attente")).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText("Salle d'attente")).toBeVisible({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
