import { test, expect } from "@playwright/test";
import { randomRoomCode, gotoRoom, launchSession } from "./helpers";

// Challenge stickers en duo (docs/STICKER-CHALLENGES.md) : connexion des deux
// pairs, sticker affiché pendant la capture côté hôte comme invité, séance
// complète jusqu'à la bande composée.
test("challenge duo : connexion → sticker affiché → bande composée", async ({ browser }) => {
  // Timeout global par défaut (45s, voir playwright.config.ts) trop juste :
  // la phase de lecture par pose (config.challenge.revealMs) allonge la
  // séance de plusieurs secondes par rapport au happy-path classique.
  test.setTimeout(60_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  // Qui devient l'hôte (autoritaire sur la config) dépend de l'ordre de
  // connexion réel au signaling, pas déterministe depuis le test (voir
  // launchSession ci-dessous) — mode/pack doivent donc être posés sur les
  // deux pages, pas seulement A, sinon la session peut retomber en classique
  // si B se retrouve hôte.
  await gotoRoom(a, room, { poses: 3, mode: "challenge", pack: "cats" });
  await gotoRoom(b, room, { mode: "challenge", pack: "cats" });

  // Tuto "voici ce que vous allez faire" (aperçu des stickers de la séance) —
  // affiché aux deux pairs dès la connexion (remplace l'écran "2 connectés"
  // habituel en mode challenge, voir Lobby.tsx), doit être fermé avant que le
  // bouton de lancement ne redevienne accessible.
  await expect(a.getByText("Voici ce que vous allez faire")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("Voici ce que vous allez faire")).toBeVisible({ timeout: 20_000 });
  await a.getByRole("button", { name: "J'ai compris" }).click();
  await b.getByRole("button", { name: "J'ai compris" }).click();

  await launchSession(a, b);

  // La colonne sticker centrale n'a pas de texte distinctif par sticker
  // (dessin procédural), mais porte un libellé stable ("Modèle") — c'est le
  // signal challenge-only le plus fiable sans introduire de test-id.
  await expect(a.getByText("Modèle")).toBeVisible({ timeout: 15_000 });
  await expect(b.getByText("Modèle")).toBeVisible({ timeout: 15_000 });

  // Timeout plus large que le happy-path classique : la phase de lecture
  // (config.challenge.revealMs) ajoute plusieurs secondes par pose au total
  // de la séance (voir docs/STICKER-CHALLENGES.md).
  await expect(a.getByText("bande est prête")).toBeVisible({ timeout: 40_000 });
  await expect(b.getByText("bande est prête")).toBeVisible({ timeout: 40_000 });

  await contextA.close();
  await contextB.close();
});
