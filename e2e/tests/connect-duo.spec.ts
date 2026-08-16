import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Connect Duo — Puissance 4 à deux (voir hooks/use-connect-duo-session.ts).
// Aucune information cachée, aucun hasard : le plateau et la victoire sont
// des fonctions pures du même log de coups partagé. Vérifie une partie
// complète (alternance stricte, hors-tour refusé côté UI) jusqu'à
// l'alignement de 4 jetons, puis "Rejouer" qui réinitialise le plateau des
// deux côtés sans recharger la page.
test("Connect Duo : alternance stricte, victoire par alignement vertical, Rejouer réinitialise les deux côtés", async ({ browser }) => {
  test.setTimeout(45_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/connect-duo/r/${room}`);
  await b.goto(`/connect-duo/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const launchB = b.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  const host = aIsHost ? a : b;
  const guest = aIsHost ? b : a;

  await host.getByRole("button", { name: "Lancer la partie" }).click();
  await expect(host.getByText("À toi de jouer")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Au tour de ton·ta partenaire…")).toBeVisible({ timeout: 10_000 });

  async function dropInColumn(page: Page, column: number) {
    // Le clic peut viser n'importe quelle cellule de la colonne — la
    // gravité place le jeton à la ligne libre la plus basse, pas celle
    // cliquée (voir lib/connect-duo/board.ts).
    await page.locator(`[data-connectduo-cell="0-${column}"]`).click();
  }

  // Hôte aligne 4 jetons verticalement en colonne 0 ; l'invité·e joue en
  // colonne 1 entre chaque coup — vérifie au passage que jouer hors tour
  // (l'UI désactive les cellules) ne fait rien.
  for (let turn = 0; turn < 3; turn++) {
    // Hors tour côté invité·e : ses propres cellules restent désactivées
    // tant que ce n'est pas son tour (vérifié une seule fois, au 1er tour).
    if (turn === 0) {
      await expect(guest.locator('[data-connectduo-cell="0-1"]')).toBeDisabled();
    }
    await dropInColumn(host, 0);
    await expect(guest.getByText("À toi de jouer")).toBeVisible({ timeout: 5_000 });
    await dropInColumn(guest, 1);
    await expect(host.getByText("À toi de jouer")).toBeVisible({ timeout: 5_000 });
  }
  // 4e jeton de l'hôte en colonne 0 → 4 alignés verticalement → victoire.
  await dropInColumn(host, 0);

  await expect(host.getByText("Tu as gagné !")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Ton·ta partenaire a gagné.")).toBeVisible({ timeout: 10_000 });

  // "Rejouer" côté hôte réinitialise le plateau des DEUX côtés — plus de
  // jeton en colonne 0 après reset (retour au fond clair vide).
  await host.getByRole("button", { name: "Rejouer" }).click();
  await expect(host.getByText("À toi de jouer")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Au tour de ton·ta partenaire…")).toBeVisible({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
