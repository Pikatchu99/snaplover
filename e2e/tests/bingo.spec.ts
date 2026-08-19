import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Bingo — bingo classique à deux, sans aucun tour (voir
// hooks/use-bingo-session.ts). Un tirage réellement aléatoire prendrait en
// moyenne ~40 numéros (simulation Monte-Carlo sur 2000 parties) avant qu'une
// ligne ne se complète naturellement — bien trop lent et non déterministe
// pour un test e2e fiable (~2-3 min par manche, 3 manches). Le test fige
// donc `Math.random` côté navigateur (via `page.evaluate`, AVANT tout
// lancement de manche — generateCard()/shuffle75() n'y touchent qu'à partir
// du clic "Lancer la partie") à une constante qui fait complèter la colonne
// B en exactement 5 tirages, avec le VRAI algorithme de mélange (voir
// lib/bingo/card.ts, lib/bingo/draw-order.ts) — ne modifie ni ne contourne
// le code de production, juste sa source d'aléa. Vérifie : victoire de
// l'hôte (manche 0, hôte donneur de numéros), victoire de l'invité·e
// (manche 1, rôle alterné), et une égalité volontaire (manche 2, les deux
// réclament coup sur coup — carte et tirage identiques des deux côtés vu la
// même constante, donc même index de complétion → la fenêtre de grâce doit
// départager par index de tirage, jamais par ordre d'arrivée réseau, voir
// `config.bingo.claimGraceMs`) jusqu'au récap téléchargeable et Rejouer.
test("Bingo : victoire hôte, victoire invité·e, égalité volontaire → récap téléchargeable, Rejouer sans reconnexion", async ({
  browser,
}) => {
  test.setTimeout(150_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/bingo/r/${room}`);
  await b.goto(`/bingo/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  const host = aIsHost ? a : b;
  const guest = aIsHost ? b : a;

  // Constante choisie par recherche (voir simulation) : fait tomber les 5
  // premiers numéros du tirage exactement sur la colonne B (index 0) de la
  // carte générée avec cette même constante.
  const RANDOM_CONSTANT = 0.0001;
  await host.evaluate((k) => {
    Math.random = () => k;
  }, RANDOM_CONSTANT);
  await guest.evaluate((k) => {
    Math.random = () => k;
  }, RANDOM_CONSTANT);

  await host.getByRole("button", { name: "Lancer la partie" }).click();

  function claimButton(page: Page) {
    return page.getByRole("button", { name: "BINGO !" });
  }

  async function waitClaimArmed(page: Page) {
    await expect(claimButton(page)).toBeEnabled({ timeout: 25_000 });
  }

  // Manche 0 : l'hôte donne les numéros (parité de manche, voir
  // callerIsInitiatorForRound) et réclame seul — victoire nette.
  await waitClaimArmed(host);
  await waitClaimArmed(guest);
  await claimButton(host).click();
  await expect(host.getByText("Bingo ! Tu as gagné !")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Ton·ta partenaire a crié Bingo en premier·ère.")).toBeVisible({ timeout: 10_000 });
  await guest.getByRole("button", { name: "Manche suivante" }).click();

  // Manche 1 : rôle de donneur·se alterné — l'invité·e réclame seul·e cette
  // fois.
  await waitClaimArmed(host);
  await waitClaimArmed(guest);
  await claimButton(guest).click();
  await expect(guest.getByText("Bingo ! Tu as gagné !")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByText("Ton·ta partenaire a crié Bingo en premier·ère.")).toBeVisible({ timeout: 10_000 });
  await host.getByRole("button", { name: "Manche suivante" }).click();

  // Manche 2 (dernière) : les deux réclament quasi simultanément → égalité,
  // pas "premier arrivé sur le réseau". Les deux clics sont lancés SANS
  // s'attendre l'un l'autre (Promise.all, pas deux `await` séquentiels) :
  // chaque `.click()` inclut son propre scroll/hover/attente d'actionabilité,
  // et les enchaîner ajoutait assez de latence réelle pour dépasser la
  // fenêtre de grâce de 400ms (`config.bingo.claimGraceMs`) sous charge —
  // l'hôte gagnait alors seul avant que le clic de l'invité·e n'atteigne un
  // bouton déjà démonté (phase passée à "reveal"), un vrai flake trouvé en
  // rejouant la suite e2e complète.
  await waitClaimArmed(host);
  await waitClaimArmed(guest);
  await Promise.all([claimButton(host).click(), claimButton(guest).click()]);
  await expect(host.getByText("Égalité — les deux ont complété en même temps !")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Égalité — les deux ont complété en même temps !")).toBeVisible({ timeout: 10_000 });

  await host.getByRole("button", { name: "Voir le récap" }).click();

  await expect(host.getByText("Votre récap Bingo")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Votre récap Bingo")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByAltText("Récap de la partie Bingo")).toBeVisible({ timeout: 10_000 });

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
