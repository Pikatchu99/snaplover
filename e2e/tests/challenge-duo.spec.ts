import { test, expect } from "@playwright/test";
import { randomRoomCode, gotoRoom, launchSession } from "./helpers";

// Challenge stickers en duo (docs/STICKER-CHALLENGES.md) : connexion des deux
// pairs, sticker affiché pendant la capture côté hôte comme invité, séance
// complète jusqu'à la bande composée.
test("challenge duo : connexion → sticker affiché → bande composée", async ({ browser }) => {
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
  await gotoRoom(a, room, { poses: 3, mode: "challenge", pack: "couple" });
  await gotoRoom(b, room, { mode: "challenge", pack: "couple" });

  await expect(a.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });

  await launchSession(a, b);

  // La colonne sticker centrale n'a pas de texte distinctif par sticker
  // (dessin procédural), mais porte un libellé stable ("Modèle") — c'est le
  // signal challenge-only le plus fiable sans introduire de test-id.
  await expect(a.getByText("Modèle")).toBeVisible({ timeout: 15_000 });
  await expect(b.getByText("Modèle")).toBeVisible({ timeout: 15_000 });

  await expect(a.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });
  await expect(b.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });

  await contextA.close();
  await contextB.close();
});
