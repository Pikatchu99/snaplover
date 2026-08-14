import { test, expect, type Locator, type Page } from "@playwright/test";
import { randomRoomCode, gotoRoom, launchSession } from "./helpers";

// Dessin collaboratif en direct — voir hooks/use-doodle.ts. Repositionné sur
// l'écran de résultat (bande déjà composée) après un premier essai en direct
// pendant la séance (3·2·1 chronométré, bien trop court pour dessiner —
// retour utilisateur réel). Aucune pression de temps ici : on vérifie juste
// la synchro live entre les deux pairs et l'effacement partagé.
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

async function drawStroke(page: Page, canvas: Locator) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas sans boîte visible");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(box.x + box.width * (0.3 + i * 0.05), box.y + box.height * (0.3 + i * 0.03));
  }
  await page.mouse.up();
}

test("dessin collaboratif sur le résultat : synchronisé en direct chez le partenaire, effacement partagé", async ({ browser }) => {
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

  const toggleA = a.getByRole("button", { name: "Dessiner" });
  await expect(toggleA).toBeVisible();

  const canvasA = a.locator('canvas[data-doodle-canvas="shared"]');
  const canvasB = b.locator('canvas[data-doodle-canvas="shared"]');

  // Avant armement : dessiner ne doit rien laisser (canvas non interactif).
  await drawStroke(a, canvasA);
  expect(await hasInk(canvasA)).toBe(false);

  await toggleA.click();
  await expect(toggleA).toHaveAttribute("aria-pressed", "true");

  await drawStroke(a, canvasA);
  expect(await hasInk(canvasA)).toBe(true);

  // Synchronisé en direct chez B, sans que B n'ait rien à faire.
  await expect.poll(() => hasInk(canvasB), { timeout: 5_000 }).toBe(true);

  // "Effacer" vide le calque partagé pour les deux, pas seulement pour celui
  // qui a cliqué (voir hooks/use-doodle.ts).
  await a.getByRole("button", { name: "Effacer" }).click();
  expect(await hasInk(canvasA)).toBe(false);
  await expect.poll(() => hasInk(canvasB), { timeout: 5_000 }).toBe(false);

  await contextA.close();
  await contextB.close();
});
