import { test, expect } from "@playwright/test";
import { randomRoomCode } from "./helpers";

async function hasInk(locator: import("@playwright/test").Locator): Promise<boolean> {
  return locator.evaluate((canvas: HTMLCanvasElement) => {
    if (canvas.width === 0 || canvas.height === 0) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
    return false;
  });
}

// Doodle Duel — mini-jeu Pictionary à deux (voir hooks/use-duel-session.ts) :
// mot secret connu du·de la dessinateur·rice seulement, dessin synchronisé en
// direct, essais du·de la deveneur·euse évalués côté dessinateur·rice, rôles
// alternés à chaque manche. Vérifie une partie complète (3 manches) jusqu'au
// récap téléchargeable.
test("Doodle Duel : 3 manches jouées (rôles alternés, bonne réponse) → récap téléchargeable", async ({ browser }) => {
  // 3 manches réelles (WebRTC + connexion à chaque fois) restent plus longues
  // qu'un test classique sans que ce soit un bug applicatif.
  test.setTimeout(90_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/duel/r/${room}`);
  await b.goto(`/duel/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer le duel" });
  const launchB = b.getByRole("button", { name: "Lancer le duel" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  let drawer = aIsHost ? a : b;
  let guesser = aIsHost ? b : a;

  // "Lancer le duel" appelle directement startDrawerPrep pour la manche 0 —
  // pas de "Voir mon mot" intermédiaire, ce clic EST déjà le signal "prêt·e".
  await (aIsHost ? launchA : launchB).click();

  for (let round = 0; round < 3; round++) {
    if (round > 0) {
      await drawer.getByRole("button", { name: "Voir mon mot" }).click();
    }
    const word = await drawer.locator("h2").textContent();
    expect(word).toBeTruthy();

    await drawer.getByRole("button", { name: "Dessiner !" }).click();

    const canvas = drawer.locator('canvas[data-duel-canvas="true"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas sans boîte visible");
    await drawer.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await drawer.mouse.down();
    await drawer.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 6 });
    await drawer.mouse.up();

    // Manche 0 seulement : le trait doit apparaître en direct chez le·la
    // deveneur·euse, sans action de sa part — le cœur du protocole réseau.
    if (round === 0) {
      const guesserCanvas = guesser.locator('canvas[data-duel-canvas="true"]');
      await expect.poll(() => hasInk(guesserCanvas), { timeout: 10_000 }).toBe(true);
    }

    // Bonne réponse (accents/casse ignorés, voir lib/doodle-duel/pick-word.ts).
    await guesser.getByPlaceholder("Ta réponse…").fill(word ?? "");
    await guesser.getByRole("button", { name: "Deviner" }).click();

    await expect(drawer.getByText("Le mot était :")).toBeVisible({ timeout: 5_000 });
    await expect(guesser.getByText("Le mot était :")).toBeVisible({ timeout: 5_000 });

    const isLastRound = round === 2;
    const nextLabel = isLastRound ? "Voir le récap" : "Manche suivante";
    await drawer.getByRole("button", { name: nextLabel }).click();
    await guesser.getByRole("button", { name: nextLabel }).click();

    [drawer, guesser] = [guesser, drawer];
  }

  await expect(a.getByText("Votre récap Doodle Duel")).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText("Votre récap Doodle Duel")).toBeVisible({ timeout: 10_000 });
  // Score/mots dessinés sur le canvas du récap (compose-recap.ts), pas dans
  // le DOM — inspectés à l'œil pendant le développement, seule l'image
  // rendue est vérifiable ici.
  await expect(a.getByAltText("Récap de la partie Doodle Duel")).toBeVisible();

  const downloadPromise = a.waitForEvent("download");
  await a.getByRole("button", { name: "Télécharger PNG" }).click();
  await downloadPromise;

  await contextA.close();
  await contextB.close();
});
