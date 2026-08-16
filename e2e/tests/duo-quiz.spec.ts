import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Duo Quiz — questions de culture générale identiques des deux côtés,
// AUCUN tour (voir hooks/use-duo-quiz-session.ts) : les deux répondent au
// même instant, sans attendre l'autre. L'hôte reste seul·e arbitre de
// manche pour toute la session (jamais d'alternance, contrairement aux
// autres jeux du hub) puisqu'il n'y a structurellement rien à cacher — la
// banque de questions est publique et identique des deux côtés. Vérifie :
// partie complète (8 questions), une manche où les deux répondent tout de
// suite (fin anticipée, bien avant les 15s), une manche où un seul côté
// répond (fin par expiration du chrono), la synchro de révélation (aucun
// flash de la bonne réponse avant que les deux aient répondu), puis le
// récap téléchargeable et "Rejouer" qui remet chaque côté dans SA PROPRE
// salle d'attente sans reconnexion.
test("Duo Quiz : 8 questions (fin anticipée + expiration du chrono), aucun flash avant réponse des deux → récap téléchargeable, Rejouer sans reconnexion", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/duo-quiz/r/${room}`);
  await b.goto(`/duo-quiz/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  const host = aIsHost ? a : b;
  const guest = aIsHost ? b : a;

  await host.getByRole("button", { name: "Lancer la partie" }).click();
  await expect(host.getByText("Question 1 / 8")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Question 1 / 8")).toBeVisible({ timeout: 10_000 });

  function choiceButton(page: Page, index: number) {
    return page.locator(`[data-duoquiz-choice="${index}"]`);
  }

  // Manche 1 : fin anticipée — les deux répondent tout de suite. Vérifie au
  // passage qu'aucune révélation n'apparaît chez l'invité·e tant qu'iel n'a
  // pas répondu, même si l'hôte a déjà répondu (pas de flash prématuré).
  await choiceButton(host, 0).click();
  await expect(guest.locator('[data-duoquiz-revealed="true"]')).toHaveCount(0);
  await choiceButton(guest, 0).click();
  await expect(host.locator('[data-duoquiz-revealed="true"]')).toHaveCount(4, { timeout: 5_000 });
  await expect(guest.locator('[data-duoquiz-revealed="true"]')).toHaveCount(4, { timeout: 5_000 });

  // Enchaînement AUTOMATIQUE vers la manche suivante (aucun clic manuel,
  // contrairement à "Manche suivante" d'Edge Letters/Word Sonar) — bien
  // avant les 15s du chrono de manche puisque les deux ont déjà répondu.
  await expect(host.getByText("Question 2 / 8")).toBeVisible({ timeout: 5_000 });
  await expect(guest.getByText("Question 2 / 8")).toBeVisible({ timeout: 5_000 });

  // Manches 2 et 3 : même schéma (fin anticipée), pour avancer jusqu'à la
  // manche 4 sans consommer le chrono complet.
  for (let round = 2; round <= 3; round++) {
    await choiceButton(host, 0).click();
    await choiceButton(guest, 0).click();
    await expect(host.getByText(`Question ${round + 1} / 8`)).toBeVisible({ timeout: 5_000 });
    await expect(guest.getByText(`Question ${round + 1} / 8`)).toBeVisible({ timeout: 5_000 });
  }

  // Manche 4 : seul l'hôte répond — la manche se termine par expiration du
  // chrono (15s) plutôt que par les deux verdicts connus ; l'incorrect
  // "non répondu" de l'invité·e compte comme une réponse fausse (voir
  // CLAUDE.md "Duo Quiz").
  await choiceButton(host, 0).click();
  await expect(host.getByText("Question 5 / 8")).toBeVisible({ timeout: 20_000 });
  await expect(guest.getByText("Question 5 / 8")).toBeVisible({ timeout: 20_000 });

  // Manches 5 à 8 : fin anticipée jusqu'au récap.
  for (let round = 5; round <= 8; round++) {
    await choiceButton(host, 0).click();
    await choiceButton(guest, 0).click();
    if (round < 8) {
      await expect(host.getByText(`Question ${round + 1} / 8`)).toBeVisible({ timeout: 5_000 });
      await expect(guest.getByText(`Question ${round + 1} / 8`)).toBeVisible({ timeout: 5_000 });
    }
  }

  await expect(host.getByText("Votre récap Duo Quiz")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Votre récap Duo Quiz")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByAltText("Récap de la partie Duo Quiz")).toBeVisible();

  const downloadPromise = host.waitForEvent("download");
  await host.getByRole("button", { name: "Télécharger PNG" }).click();
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
