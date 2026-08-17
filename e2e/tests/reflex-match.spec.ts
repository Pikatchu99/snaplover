import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Reflex Match — course de réflexes à deux (voir
// hooks/use-reflex-match-session.ts). Aucun tour : la grille se révèle au
// MÊME instant chez les deux (horloge synchronisée), course libre pour
// taper la case différente en premier. L'autorité de manche (qui mint la
// graine et arbitre) alterne par parité, mais ne gouverne jamais qui a le
// droit de taper. Vérifie : qu'une case ratée ne termine pas la manche,
// que la comparaison de deux horodatages désigne le·la plus rapide, et
// que l'absence de tentative d'un côté résout par défaut après le délai
// maximal (`config.reflexMatch.roundTimeoutMs`) plutôt qu'immédiatement —
// jusqu'au récap téléchargeable et "Rejouer".
test("Reflex Match : case ratée sans effet, comparaison d'horodatages, résolution par défaut après délai → récap téléchargeable, Rejouer sans reconnexion", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/reflex-match/r/${room}`);
  await b.goto(`/reflex-match/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  const host = aIsHost ? a : b;
  const guest = aIsHost ? b : a;

  await host.getByRole("button", { name: "Lancer la partie" }).click();

  async function waitActive(page: Page) {
    await expect(page.locator('[data-reflex-phase="active"]')).toBeVisible({ timeout: 15_000 });
  }
  async function tapOdd(page: Page) {
    await page.locator('[data-reflex-cell-odd="true"]').click();
  }
  async function tapWrong(page: Page) {
    await page.locator('[data-reflex-cell-odd="false"]').first().click();
  }

  // Manches 0 à 5 : l'hôte tape la bonne case, l'invité·e la tape aussi
  // mais après un léger délai volontaire — vérifie la comparaison de deux
  // horodatages réels, pas seulement "un seul côté a tapé".
  for (let round = 0; round < 6; round++) {
    await waitActive(host);
    await waitActive(guest);

    if (round === 0) {
      // Une case ratée ne termine jamais la manche, ni ne bloque de
      // retaper — vérifié une seule fois, au premier round.
      await tapWrong(guest);
      await expect(guest.locator('[data-reflex-phase="active"]')).toBeVisible();
    }

    await tapOdd(host);
    await guest.waitForTimeout(150);
    await tapOdd(guest);

    await expect(host.getByText("Tu as été le·la plus rapide !")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByText("Ton·ta partenaire a été le·la plus rapide.")).toBeVisible({ timeout: 10_000 });

    // "Manche suivante" : n'importe quel côté peut cliquer — alterne pour
    // couvrir les deux chemins.
    const clicker = round % 2 === 0 ? guest : host;
    await clicker.getByRole("button", { name: "Manche suivante" }).click();
  }

  // Manche 6 (7e et dernière) : seul l'hôte tape, l'invité·e ne tape
  // jamais — la manche doit résoudre par défaut APRÈS le délai maximal
  // (config.reflexMatch.roundTimeoutMs), jamais dès que le tap de l'hôte
  // arrive (ça transformerait une latence réseau normale en défaite
  // injustifiée pour l'invité·e, voir CLAUDE.md).
  await waitActive(host);
  await waitActive(guest);
  await tapOdd(host);

  await expect(host.getByText("Tu as été le·la plus rapide !")).toBeVisible({ timeout: 8_000 });
  await expect(guest.getByText("Ton·ta partenaire a été le·la plus rapide.")).toBeVisible({ timeout: 8_000 });
  await expect(guest.getByText("Ton·ta partenaire a tapé la seule bonne réponse à temps.")).toBeVisible();

  await host.getByRole("button", { name: "Voir le récap" }).click();

  await expect(host.getByText("Votre récap Reflex Match")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Votre récap Reflex Match")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByAltText("Récap de la partie Reflex Match")).toBeVisible({ timeout: 10_000 });

  const downloadButton = host.getByRole("button", { name: "Télécharger PNG" });
  await expect(downloadButton).toBeEnabled({ timeout: 10_000 });
  const downloadPromise = host.waitForEvent("download");
  await downloadButton.click();
  await downloadPromise;

  // "Rejouer" — aucun message réseau (voir CLAUDE.md) : chaque côté doit
  // cliquer indépendamment pour revenir à SA PROPRE salle d'attente.
  await host.getByRole("button", { name: "Rejouer" }).click();
  await expect(host.getByText("Salle d'attente")).toBeVisible({ timeout: 10_000 });
  await guest.getByRole("button", { name: "Rejouer" }).click();
  await expect(guest.getByText("Salle d'attente")).toBeVisible({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
