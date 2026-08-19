import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Fleet Siege — bataille navale classique à deux (voir
// hooks/use-fleet-siege-session.ts). Contrairement à Connect Duo, il y a une
// information cachée (la flotte de chacun·e) mais aucune autorité à
// négocier : chaque plateau calcule localement le verdict de ses propres
// tirs reçus. Vérifie : placement manuel des deux flottes, tour strictement
// alterné (host tire en premier au match 0), coulage complet d'une flotte →
// écran de révélation + récap téléchargeable, puis "Rejouer" qui remet les
// deux côtés en placement avec le premier tireur inversé (match 1 →
// invité·e en premier).
test("Fleet Siege : placement, tour strictement alterné, coulage complet → récap téléchargeable, Rejouer inverse le premier tireur", async ({
  browser,
}) => {
  test.setTimeout(60_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/fleet-siege/r/${room}`);
  await b.goto(`/fleet-siege/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  const host = aIsHost ? a : b;
  const guest = aIsHost ? b : a;

  await host.getByRole("button", { name: "Lancer la partie" }).click();
  await expect(host.getByText("Placez votre flotte")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Placez votre flotte")).toBeVisible({ timeout: 10_000 });

  // Même flotte des deux côtés, horizontale, dans le coin haut-gauche :
  // navire de 4 en ligne 0, de 3 en ligne 2, de 2 en ligne 4 — laisse la
  // ligne 7 entièrement libre pour les tirs "à l'aveugle" de l'invité·e.
  async function placeFleet(page: Page) {
    const placements: [number, string][] = [
      [4, "0-0"],
      [3, "2-0"],
      [2, "4-0"],
    ];
    for (const [size, originCell] of placements) {
      await page.locator(`[data-fleetsiege-ship-size="${size}"]`).click();
      await page.locator(`[data-fleetsiege-placement-cell="${originCell}"]`).click();
    }
    await page.getByRole("button", { name: "Confirmer la flotte" }).click();
  }

  async function playFirstGame() {
    await Promise.all([placeFleet(host), placeFleet(guest)]);

    // Match 0 : l'hôte tire en premier (voir firstShooterForMatch).
    await expect(host.getByText("À toi de tirer")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByText("Au tour de ton·ta partenaire…")).toBeVisible({ timeout: 10_000 });

    // L'hôte coule les 3 navires de l'invité·e (mêmes coordonnées, flotte
    // symétrique) : 4 + 3 + 2 = 9 tirs. L'invité·e tire "à l'aveugle" sur la
    // ligne 7 (entièrement libre côté hôte) entre chaque tir de l'hôte — 8
    // tirs, jamais le dernier (la partie se termine sur le 9e tir de l'hôte
    // avant que l'invité·e ne rejoue).
    const hostShots = ["0-0", "0-1", "0-2", "0-3", "2-0", "2-1", "2-2", "4-0", "4-1"];
    const guestBlindShots = ["7-0", "7-1", "7-2", "7-3", "7-4", "7-5", "7-6", "7-7"];

    for (let i = 0; i < hostShots.length; i++) {
      await expect(host.getByText("À toi de tirer")).toBeVisible({ timeout: 10_000 });
      await host.locator(`[data-fleetsiege-target-cell="${hostShots[i]}"]`).click();
      if (i < hostShots.length - 1) {
        await expect(guest.getByText("À toi de tirer")).toBeVisible({ timeout: 10_000 });
        await guest.locator(`[data-fleetsiege-target-cell="${guestBlindShots[i]}"]`).click();
      }
    }

    await expect(host.getByText("Tu as coulé toute la flotte adverse !")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByText("Ta flotte a été coulée.")).toBeVisible({ timeout: 10_000 });
  }

  await playFirstGame();

  // Carte récap partageable (règle du hub : "tous les jeux doivent avoir
  // ça") — les deux flottes révélées côte à côte, composée dès la fin de
  // partie, téléchargeable en PNG.
  const downloadButton = host.getByRole("button", { name: "Télécharger PNG" });
  await expect(downloadButton).toBeEnabled({ timeout: 10_000 });
  const downloadPromise = host.waitForEvent("download");
  await downloadButton.click();
  await downloadPromise;

  // "Rejouer" côté hôte remet les DEUX côtés en placement sur la MÊME
  // connexion, sans recharger — et le premier tireur s'inverse au match
  // suivant (match 1 → invité·e en premier, voir firstShooterForMatch).
  await host.getByRole("button", { name: "Rejouer" }).click();
  await expect(host.getByText("Placez votre flotte")).toBeVisible({ timeout: 10_000 });
  await expect(guest.getByText("Placez votre flotte")).toBeVisible({ timeout: 10_000 });

  await Promise.all([placeFleet(host), placeFleet(guest)]);
  await expect(guest.getByText("À toi de tirer")).toBeVisible({ timeout: 10_000 });
  await expect(host.getByText("Au tour de ton·ta partenaire…")).toBeVisible({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
