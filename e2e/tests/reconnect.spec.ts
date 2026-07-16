import { test, expect } from "@playwright/test";
import { randomRoomCode, gotoRoom, launchSession } from "./helpers";

// États obligatoires "Countdown suspendu" / "Partenaire déconnecté" +
// reprise — SNAPROOM-SPEC.md §12. Fermer le contexte du partenaire en pleine
// séance simule une coupure réseau brutale (pas un aller-retour propre côté
// app) ; la pose interrompue doit reprendre entièrement à zéro pour les deux
// pairs une fois le partenaire revenu sur le même lien.
test("coupure du partenaire en pleine séance → overlay → reconnexion → bande complète", async ({ browser }) => {
  const room = randomRoomCode();
  const contextA = await browser.newContext();
  let contextB = await browser.newContext();
  const a = await contextA.newPage();
  let b = await contextB.newPage();

  await gotoRoom(a, room, { poses: 3 });
  await gotoRoom(b, room);

  await expect(a.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });

  await launchSession(a, b);

  // Coupure brutale du partenaire, sans attendre qu'une pose particulière
  // soit en cours — le mécanisme doit couvrir countdown suspendu (aucune
  // pose faite) comme partenaire déconnecté (poses déjà prises conservées).
  await contextB.close();

  await expect(a.getByText("On attend Partenaire")).toBeVisible({ timeout: 15_000 });

  // Le partenaire revient sur le même lien (nouvel onglet, état neuf).
  contextB = await browser.newContext();
  b = await contextB.newPage();
  await gotoRoom(b, room);

  await expect(a.getByText("bande est prête")).toBeVisible({ timeout: 30_000 });
  await expect(b.getByText("bande est prête")).toBeVisible({ timeout: 30_000 });

  await contextA.close();
  await contextB.close();
});
