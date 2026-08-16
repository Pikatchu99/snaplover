import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Edge Letters — chaque manche, chacun·e choisit une lettre (début ou fin,
// rôle qui alterne) et les deux courent librement (aucun tour, voir
// hooks/use-edge-letters-session.ts) à taper un vrai mot français qui les
// respecte. Un·e arbitre par manche (même parité que le rôle) tranche.
// Vérifie 5 manches complètes — alternant qui est arbitre et qui gagne
// (recevoir-et-juger la tentative de l'autre ET s'auto-résoudre en tant que
// propre arbitre) — jusqu'au récap téléchargeable.
test("Edge Letters : 5 manches jouées (rôles et arbitrage alternés, course sans tour) → récap téléchargeable", async ({ browser }) => {
  test.setTimeout(60_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/edge-letters/r/${room}`);
  await b.goto(`/edge-letters/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const launchB = b.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  const host = aIsHost ? a : b;
  const guest = aIsHost ? b : a;

  await host.getByRole("button", { name: "Lancer la partie" }).click();

  async function pickLetter(page: Page, letter: string) {
    await page.getByRole("button", { name: letter, exact: true }).click();
  }

  async function submitWord(page: Page, word: string) {
    await page.getByPlaceholder("Ton mot…").fill(word);
    await page.getByRole("button", { name: "Valider" }).click();
  }

  // Manche 0 (hôte = début + arbitre, invité·e = fin) : "CHAT" soumis par
  // l'invité·e — teste le chemin "l'arbitre reçoit et juge la tentative de
  // l'autre".
  await expect(host.getByText("Choisis la lettre de DÉBUT")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Choisis la lettre de FIN")).toBeVisible({ timeout: 10_000 });
  await pickLetter(host, "C");
  await pickLetter(guest, "T");
  await expect(host.getByPlaceholder("Ton mot…")).toBeVisible({ timeout: 10_000 });
  await submitWord(guest, "CHAT");
  await expect(host.getByText("Ton·ta partenaire a trouvé le mot en premier.")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Tu as trouvé le mot en premier !")).toBeVisible({ timeout: 10_000 });
  await host.getByRole("button", { name: "Manche suivante" }).click();
  await expect(guest.getByText("Manche 2 / 5")).toBeVisible({ timeout: 5_000 });

  // Manche 1 (invité·e = début + arbitre, hôte = fin) : "PAIN" soumis par
  // l'hôte — même chemin, arbitrage inversé.
  await expect(guest.getByText("Choisis la lettre de DÉBUT")).toBeVisible({ timeout: 10_000 });
  await pickLetter(guest, "P");
  await pickLetter(host, "N");
  await expect(guest.getByPlaceholder("Ton mot…")).toBeVisible({ timeout: 10_000 });
  await submitWord(host, "PAIN");
  await expect(host.getByText("Tu as trouvé le mot en premier !")).toBeVisible({ timeout: 10_000 });
  await guest.getByRole("button", { name: "Manche suivante" }).click();
  await expect(host.getByText("Manche 3 / 5")).toBeVisible({ timeout: 5_000 });

  // Manche 2 (hôte = début + arbitre) : "ROSE" soumis par l'hôte lui-même —
  // teste le chemin "l'arbitre gagne via sa propre tentative".
  await pickLetter(host, "R");
  await pickLetter(guest, "E");
  await submitWord(host, "ROSE");
  await expect(guest.getByText("Ton·ta partenaire a trouvé le mot en premier.")).toBeVisible({ timeout: 10_000 });
  await host.getByRole("button", { name: "Manche suivante" }).click();
  await expect(guest.getByText("Manche 4 / 5")).toBeVisible({ timeout: 5_000 });

  // Manche 3 (invité·e = début + arbitre) : "VELO" soumis par l'invité·e
  // elle·lui-même — même chemin, arbitrage inversé.
  await pickLetter(guest, "V");
  await pickLetter(host, "O");
  await submitWord(guest, "VELO");
  await expect(guest.getByText("Tu as trouvé le mot en premier !")).toBeVisible({ timeout: 10_000 });
  await guest.getByRole("button", { name: "Manche suivante" }).click();
  await expect(host.getByText("Manche 5 / 5")).toBeVisible({ timeout: 5_000 });

  // Manche 4, dernière (hôte = début + arbitre) : "MENU" soumis par
  // l'invité·e — "Voir le récap" au lieu de "Manche suivante".
  await pickLetter(host, "M");
  await pickLetter(guest, "U");
  await submitWord(guest, "MENU");
  await expect(guest.getByText("Tu as trouvé le mot en premier !")).toBeVisible({ timeout: 10_000 });
  await guest.getByRole("button", { name: "Voir le récap" }).click();

  await expect(host.getByText("Votre récap Edge Letters")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Votre récap Edge Letters")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByAltText("Récap de la partie Edge Letters")).toBeVisible();

  const downloadPromise = host.waitForEvent("download");
  await host.getByRole("button", { name: "Télécharger PNG" }).click();
  await downloadPromise;

  await contextA.close();
  await contextB.close();
});
