import { test, expect } from "@playwright/test";
import { randomRoomCode, gotoRoom } from "./helpers";

// État obligatoire "Room pleine (2/2)" — SNAPROOM-SPEC.md §12.
test("un 3e arrivant voit l'état room pleine avec sa CTA", async ({ browser }) => {
  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const contextC = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();
  const c = await contextC.newPage();

  await gotoRoom(a, room);
  await gotoRoom(b, room);
  await expect(a.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });

  await gotoRoom(c, room);

  await expect(c.getByText("c'est à deux")).toBeVisible({ timeout: 15_000 });
  await expect(c.getByRole("link", { name: "Créer une nouvelle room" })).toBeVisible();

  await contextA.close();
  await contextB.close();
  await contextC.close();
});
