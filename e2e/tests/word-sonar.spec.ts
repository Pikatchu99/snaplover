import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Word Sonar — bataille navale de mots (voir hooks/use-word-sonar-session.ts).
// La vraie conversation ("as-tu telle lettre ? à quelle position ?") se
// passe à l'oral, entièrement hors du protocole réseau — l'app n'est qu'un
// carnet de notes personnel et une tentative de mot entier, possible à tout
// moment, jamais soumise à un tour. Partie unique du début à la fin (pas de
// manches). Vérifie : une tentative incorrecte ne termine rien, une
// tentative correcte (hors tour, bug réel corrigé) termine la partie et
// révèle les DEUX mots des deux côtés, jusqu'au récap téléchargeable.
test("Word Sonar : tentative incorrecte continue, tentative correcte hors tour révèle les deux mots → récap téléchargeable", async ({ browser }) => {
  test.setTimeout(60_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/word-sonar/r/${room}`);
  await b.goto(`/word-sonar/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const launchB = b.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  const host = aIsHost ? a : b;
  const guest = aIsHost ? b : a;

  // Longueur 4 (borne min) via la touche Home du slider natif — plus simple
  // et plus fiable qu'injecter une valeur, `.fill()` de Playwright ne
  // supportant pas les input[type=range].
  const lengthSlider = host.locator('input[type="range"]');
  await lengthSlider.focus();
  await lengthSlider.press("Home");
  await host.getByRole("button", { name: "Lancer la partie" }).click();

  async function submitSecretWord(page: Page, word: string) {
    await page.getByPlaceholder("Ton mot…").fill(word);
    await page.getByRole("button", { name: "Valider mon mot" }).click();
  }

  // Aucun bouton "Valider" : remplir la dernière case tente automatiquement.
  async function fillGuessBoxes(page: Page, word: string) {
    for (let i = 0; i < word.length; i++) {
      await page.locator(`input[data-wordsonar-box="${i}"]`).fill(word[i]);
    }
  }

  await submitSecretWord(host, "CHAT");
  await submitSecretWord(guest, "VELO");
  await expect(host.getByText("Ton mot : CHAT")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Ton mot : VELO")).toBeVisible({ timeout: 10_000 });

  // Tentative incorrecte (guest essaie de deviner le mot de l'hôte) → rien
  // ne se passe, la partie continue normalement.
  await fillGuessBoxes(guest, "PORT");
  await guest.waitForTimeout(500);
  await expect(guest.getByText("Ton mot : VELO")).toBeVisible();

  // L'hôte voit en direct l'avancée de l'invité·e sur SON mot (retour
  // utilisateur : "chaque joueur doit savoir où en est son adversaire") —
  // les 4 cases remplies par l'invité·e doivent apparaître comme remplies
  // côté hôte, jamais les lettres elles-mêmes.
  for (let i = 0; i < 4; i++) {
    await expect(host.locator(`[data-wordsonar-peer-progress="${i}"]`)).toHaveAttribute("data-filled", "true", {
      timeout: 5_000,
    });
  }

  // Bug réel corrigé : une tentative correcte ne doit PAS attendre un tour
  // ("hors tour" n'a même plus de sens ici, il n'y a plus de notion de
  // tour du tout) — l'hôte tente directement le mot de l'invité·e et doit
  // gagner immédiatement.
  await fillGuessBoxes(host, "VELO");

  await expect(host.getByText("Tu as gagné !")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Tu as perdu.")).toBeVisible({ timeout: 10_000 });

  // Les DEUX mots sont révélés des DEUX côtés — pas seulement celui qui a
  // été deviné (retour utilisateur réel : qui perd doit voir le mot de
  // l'autre qu'iel n'a pas réussi à deviner). Une fois composée, la carte
  // récap n'est plus qu'une image canvas (comme pour Doodle Duel) — les mots
  // ne sont vérifiables qu'à l'œil sur l'image rendue, pas via le DOM.
  await expect(host.getByAltText("Récap de la partie Word Sonar")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByAltText("Récap de la partie Word Sonar")).toBeVisible({ timeout: 10_000 });

  const downloadPromise = host.waitForEvent("download");
  await host.getByRole("button", { name: "Télécharger PNG" }).click();
  await downloadPromise;

  await contextA.close();
  await contextB.close();
});
