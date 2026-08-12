import { test, expect, type Locator } from "@playwright/test";
import { randomRoomCode, gotoRoom, launchSession } from "./helpers";

// Vérifie la couche de synchro temps réel du dessin collaboratif (voir
// hooks/use-doodle.ts) : ce qu'un pair dessine sur SA PROPRE caméra doit
// apparaître, en direct, sur le canvas "peer" de l'autre pair. L'incrustation
// dans la photo finale (capture-frame.ts) est vérifiée séparément à l'œil
// (canvas API pure, risque de régression bien plus faible que le protocole
// réseau ci-dessous).
async function hasInk(locator: Locator): Promise<boolean> {
  return locator.evaluate((canvas: HTMLCanvasElement) => {
    if (canvas.width === 0 || canvas.height === 0) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
    return false;
  });
}

async function drawStroke(page: import("@playwright/test").Page, canvas: Locator) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas sans boîte visible");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(box.x + box.width * (0.3 + i * 0.05), box.y + box.height * (0.3 + i * 0.03));
  }
  await page.mouse.up();
}

test("dessin collaboratif : armé sur sa propre caméra → synchronisé en direct chez le partenaire → effacement propagé", async ({
  browser,
}) => {
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

  const toggleA = a.getByRole("button", { name: "Dessiner" });
  await expect(toggleA).toBeVisible({ timeout: 5_000 });

  const myCanvasA = a.locator('canvas[data-doodle-canvas="mine"]');
  const peerCanvasB = b.locator('canvas[data-doodle-canvas="peer"]');

  // Avant armement : dessiner ne doit rien laisser (canvas non interactif).
  await drawStroke(a, myCanvasA);
  expect(await hasInk(myCanvasA)).toBe(false);

  await toggleA.click();
  await expect(toggleA).toHaveAttribute("aria-pressed", "true");

  await drawStroke(a, myCanvasA);
  expect(await hasInk(myCanvasA)).toBe(true);

  // Synchronisé en direct sur le canvas "peer" de B, sans action de B.
  await expect.poll(() => hasInk(peerCanvasB), { timeout: 5_000 }).toBe(true);

  await a.getByRole("button", { name: "Effacer" }).click();
  expect(await hasInk(myCanvasA)).toBe(false);
  await expect.poll(() => hasInk(peerCanvasB), { timeout: 5_000 }).toBe(false);

  await contextA.close();
  await contextB.close();
});
