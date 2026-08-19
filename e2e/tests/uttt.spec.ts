import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Ultimate Tic-Tac-Toe — méta-plateau 3x3 de neuf morpions (voir
// hooks/use-uttt-session.ts, lib/uttt/win-check.ts). Aucune information
// cachée : tout est dérivé du même log de coups partagé, aucune autorité à
// négocier pour la légalité ou la victoire. La salle d'attente n'a AUCUN
// bouton "Lancer la partie" (contrairement aux autres jeux) : la partie
// démarre automatiquement dès que les deux "uttt-ready" se sont croisés.
//
// La séquence de 17 coups ci-dessous a été générée et vérifiée par un
// script one-off (voir la conversation de développement) rejouant
// indépendamment lib/uttt/win-check.ts contre des états de plateau
// construits à la main — elle exerce à la fois : le routage forcé normal,
// un coup forcé vers un sous-plateau DÉJÀ DÉCIDÉ (le 17e et dernier coup,
// qui donne un choix libre à X puisque le sous-plateau visé est déjà
// gagné par O) — le piège explicitement identifié dans la spec du jeu
// ("won OU draw lève la contrainte, pas seulement won") — et se termine
// par une victoire méta de l'hôte (X) en alignant les sous-plateaux 1, 4, 7.
const MOVES: [number, number][] = [
  [4, 0], [0, 7], [7, 2], [2, 4], [4, 2], [2, 1], [1, 5], [5, 1], [1, 2],
  [2, 7], [7, 1], [1, 4], [4, 1], [1, 7], [7, 0], [0, 2], [1, 8],
];

test("Ultimate Tic-Tac-Toe : démarrage automatique, routage forcé, coup libre vers un sous-plateau déjà décidé → victoire méta, récap téléchargeable, Rejouer réinitialise", async ({
  browser,
}) => {
  test.setTimeout(60_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/uttt/r/${room}`);
  await b.goto(`/uttt/r/${room}`);

  // Tutoriel de règles affiché automatiquement à la connexion (voir
  // CLAUDE.md "Ultimate Tic-Tac-Toe") — la partie ne démarre qu'une fois
  // que les DEUX côtés l'ont fermé (chacun gate son propre "uttt-ready",
  // voir hooks/use-uttt-session.ts `readyToStart`).
  async function dismissTutorial(page: Page) {
    await expect(page.getByText("Un plateau dans le plateau")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "J'ai compris" }).click();
  }
  await Promise.all([dismissTutorial(a), dismissTutorial(b)]);

  // Aucun bouton "Lancer la partie" : une fois le tutoriel fermé des deux
  // côtés, la partie démarre automatiquement.
  await expect(a.locator('[data-uttt-board="0"]')).toBeVisible({ timeout: 20_000 });
  await expect(b.locator('[data-uttt-board="0"]')).toBeVisible({ timeout: 20_000 });

  const aGoesFirst = await a.getByText("À toi de jouer").isVisible().catch(() => false);
  const host = aGoesFirst ? a : b; // hôte = X, joue toujours en premier
  const guest = aGoesFirst ? b : a;
  await expect(host.getByText("À toi de jouer")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Au tour de ton·ta partenaire…")).toBeVisible({ timeout: 10_000 });

  function cell(page: Page, boardIndex: number, cellIndex: number) {
    return page.locator(`[data-uttt-cell="${boardIndex}-${cellIndex}"]`);
  }

  // Hors tour : juste après le 1er coup de l'hôte, l'invité·e ne peut jouer
  // que dans le sous-plateau forcé (board 0) — un sous-plateau non actif
  // (ex. board 5) reste marqué inactif côté UI.
  await cell(host, MOVES[0][0], MOVES[0][1]).click();
  await expect(guest.locator('[data-uttt-board="5"]')).toHaveAttribute("data-uttt-board-active", "false");
  await expect(guest.locator('[data-uttt-board="0"]')).toHaveAttribute("data-uttt-board-active", "true");

  for (let index = 1; index < MOVES.length; index++) {
    const [boardIndex, cellIndex] = MOVES[index];
    const mover = index % 2 === 0 ? host : guest;
    await cell(mover, boardIndex, cellIndex).click();
  }

  await expect(host.getByText("Tu as gagné !")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Ton·ta partenaire a gagné.")).toBeVisible({ timeout: 10_000 });

  // Les trois sous-plateaux 1, 4 et 7 (colonne du milieu) affichent chacun
  // un grand X — plus les cellules individuelles, une fois décidés.
  await expect(host.locator('[data-uttt-board="1"]').getByText("X", { exact: true })).toBeVisible();
  await expect(host.locator('[data-uttt-board="4"]').getByText("X", { exact: true })).toBeVisible();
  await expect(host.locator('[data-uttt-board="7"]').getByText("X", { exact: true })).toBeVisible();

  const downloadButton = host.getByRole("button", { name: "Télécharger PNG" });
  await expect(downloadButton).toBeEnabled({ timeout: 10_000 });
  const downloadPromise = host.waitForEvent("download");
  await downloadButton.click();
  await downloadPromise;

  // "Rejouer" côté hôte réinitialise le plateau des DEUX côtés — plus de
  // grand X sur le sous-plateau 1, la case vide redevient jouable.
  await host.getByRole("button", { name: "Rejouer" }).click();
  await expect(host.getByText("À toi de jouer")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Au tour de ton·ta partenaire…")).toBeVisible({ timeout: 10_000 });
  await expect(cell(host, 1, 5)).toBeVisible();

  await contextA.close();
  await contextB.close();
});
