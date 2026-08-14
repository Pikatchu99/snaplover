import { test, expect } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Mind Match — mini-jeu à deux où chacun tape un mot en secret en essayant de
// converger sur le même (voir hooks/use-mindmatch-session.ts). Rôles
// parfaitement symétriques : contrairement à Doodle Duel, les deux pages font
// exactement les mêmes actions. Vérifie une partie complète (3 manches,
// convergence au premier essai puis avec un essai raté) jusqu'au récap
// téléchargeable.
test("Mind Match : 3 manches jouées (convergence directe + après un essai raté) → récap téléchargeable", async ({ browser }) => {
  test.setTimeout(60_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/mindmatch/r/${room}`);
  await b.goto(`/mindmatch/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const launchB = b.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  await (aIsHost ? launchA : launchB).click();

  async function submitWord(page: import("@playwright/test").Page, word: string) {
    await page.getByPlaceholder("Ton mot…").fill(word);
    await page.getByRole("button", { name: "Valider" }).click();
  }

  // Manche 0 : convergence dès le premier essai.
  await Promise.all([submitWord(a, "lune"), submitWord(b, "lune")]);
  await expect(a.getByText("Ça matche !")).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText("Ça matche !")).toBeVisible({ timeout: 10_000 });
  await a.getByRole("button", { name: "Manche suivante" }).click();
  await expect(b.getByText("Manche 2 / 3")).toBeVisible({ timeout: 5_000 });

  // Manche 1 : un essai raté (mots différents) avant de converger — vérifie
  // que "Nouvel essai" fait bien repartir les DEUX écrans sur un mot vierge.
  await Promise.all([submitWord(a, "chat"), submitWord(b, "chien")]);
  await expect(a.getByText("Pas encore la même chose…")).toBeVisible({ timeout: 10_000 });
  await b.getByRole("button", { name: "Nouvel essai" }).click();
  await expect(a.getByPlaceholder("Ton mot…")).toBeVisible({ timeout: 5_000 });
  await Promise.all([submitWord(a, "arbre"), submitWord(b, "arbre")]);
  await expect(a.getByText("Ça matche !")).toBeVisible({ timeout: 10_000 });
  await a.getByRole("button", { name: "Manche suivante" }).click();
  await expect(b.getByText("Manche 3 / 3")).toBeVisible({ timeout: 5_000 });

  // Manche 2 (dernière) : "Voir le récap" au lieu de "Manche suivante".
  await Promise.all([submitWord(a, "soleil"), submitWord(b, "soleil")]);
  await b.getByRole("button", { name: "Voir le récap" }).click();

  await expect(a.getByText("Votre récap Mind Match")).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText("Votre récap Mind Match")).toBeVisible({ timeout: 10_000 });
  await expect(a.getByAltText("Récap de la partie Mind Match")).toBeVisible();

  const downloadPromise = a.waitForEvent("download");
  await a.getByRole("button", { name: "Télécharger PNG" }).click();
  await downloadPromise;

  await contextA.close();
  await contextB.close();
});
