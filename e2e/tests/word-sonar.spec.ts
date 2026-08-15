import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Word Sonar — bataille navale de mots (voir hooks/use-word-sonar-session.ts) :
// chacun·e choisit un mot secret d'une longueur convenue, puis on alterne
// question ("as-tu telle lettre ?", position révélée si oui) tandis qu'une
// tentative du mot entier reste possible à tout moment, même hors tour — bug
// réel trouvé en testant : une tentative correcte devait sinon attendre que
// l'autre joue. Une case remplie tente automatiquement, aucun clic requis
// (retour utilisateur réel). Vérifie une partie complète (3 manches, rôles
// d'interrogateur·rice alternés, une élimination, une lettre trouvée, une
// victoire hors tour) jusqu'au récap téléchargeable.
test("Word Sonar : 3 manches jouées (lettres + tentatives hors tour, rôles alternés) → récap téléchargeable", async ({ browser }) => {
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

  // Aucun bouton "Valider" : remplir la dernière case tente automatiquement
  // (voir hooks/use-word-sonar-session.ts guessWord() / WordSonarRoundStage.tsx).
  async function fillGuessBoxes(page: Page, word: string) {
    for (let i = 0; i < word.length; i++) {
      const box = page.locator(`input[data-wordsonar-box="${i}"]`);
      if (!(await box.isDisabled())) await box.fill(word[i]);
    }
  }

  // Manche 0 (l'hôte interroge en premier) : mot host="CHAT", guest="VELO".
  await submitSecretWord(host, "CHAT");
  await submitSecretWord(guest, "VELO");
  await expect(host.getByText("À toi de jouer")).toBeVisible({ timeout: 10_000 });

  // "Z" absent de VELO → éliminé, le tour passe à l'invité·e.
  await host.getByRole("button", { name: "Z", exact: true }).click();
  await expect(host.getByRole("button", { name: "Z", exact: true })).toBeDisabled({ timeout: 5_000 });
  await expect(guest.getByText("À toi de jouer")).toBeVisible({ timeout: 5_000 });

  // L'invité·e tente directement le mot de l'hôte (connu du test, à son tour
  // cette fois) → gagne la manche 0.
  await fillGuessBoxes(guest, "CHAT");
  await expect(host.getByText("Ton·ta partenaire a trouvé ton mot.")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Tu as trouvé le mot de ton·ta partenaire !")).toBeVisible({ timeout: 10_000 });
  await host.getByRole("button", { name: "Manche suivante" }).click();
  await expect(guest.getByText("Manche 2 / 3")).toBeVisible({ timeout: 5_000 });

  // Manche 1 (l'invité·e interroge en premier — alternance par manche) :
  // mot host="PAIN", guest="OURS". Bug réel corrigé : l'hôte n'a PAS la main
  // ici (c'est le tour de l'invité·e) mais tente quand même directement le
  // mot de l'invité·e — doit gagner sans attendre son tour.
  await submitSecretWord(host, "PAIN");
  await submitSecretWord(guest, "OURS");
  await expect(guest.getByText("À toi de jouer")).toBeVisible({ timeout: 10_000 });

  await fillGuessBoxes(host, "OURS");
  await expect(guest.getByText("Ton·ta partenaire a trouvé ton mot.")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByText("Tu as trouvé le mot de ton·ta partenaire !")).toBeVisible({ timeout: 10_000 });
  await guest.getByRole("button", { name: "Manche suivante" }).click();
  await expect(host.getByText("Manche 3 / 3")).toBeVisible({ timeout: 5_000 });

  // Manche 2, dernière (l'hôte interroge en premier) : mot host="ROSE", guest="MENU".
  await submitSecretWord(host, "ROSE");
  await submitSecretWord(guest, "MENU");
  await expect(host.getByText("À toi de jouer")).toBeVisible({ timeout: 10_000 });

  // "E" présent dans MENU (position 2, 1-indexée) → révélé et rempli dans le
  // tableau de l'hôte, le tour passe à l'invité·e.
  await host.getByRole("button", { name: "E", exact: true }).click();
  await expect(host.locator('input[data-wordsonar-box="1"]')).toHaveValue("E", { timeout: 5_000 });
  await expect(guest.getByText("À toi de jouer")).toBeVisible({ timeout: 5_000 });

  // L'invité·e tente directement le mot de l'hôte → gagne la dernière manche,
  // "Voir le récap" au lieu de "Manche suivante".
  await fillGuessBoxes(guest, "ROSE");
  await expect(guest.getByText("Tu as trouvé le mot de ton·ta partenaire !")).toBeVisible({ timeout: 10_000 });
  await guest.getByRole("button", { name: "Voir le récap" }).click();

  await expect(host.getByText("Votre récap Word Sonar")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Votre récap Word Sonar")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByAltText("Récap de la partie Word Sonar")).toBeVisible();

  const downloadPromise = host.waitForEvent("download");
  await host.getByRole("button", { name: "Télécharger PNG" }).click();
  await downloadPromise;

  await contextA.close();
  await contextB.close();
});
