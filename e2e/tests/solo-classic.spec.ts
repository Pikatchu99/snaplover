import { test, expect } from "@playwright/test";

// Photobooth solo classique (extension de docs/STICKER-CHALLENGES.md) :
// capture 100% locale, sans room ni WebRTC, sans sticker — un seul contexte
// de navigateur (pas de pair à connecter).
test("solo classique : caméra prête → séance → bande composée", async ({ page }) => {
  await page.goto("/solo?poses=3&frame=classic&mode=classic&name=Testeur");

  await expect(page.getByRole("button", { name: "Lancer la séance" })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Lancer la séance" }).click();

  await expect(page.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });

  // Pas de sticker, pas de texte lié à un partenaire en solo classique.
  await expect(page.getByText("Modèle")).toHaveCount(0);
  await expect(page.getByText("Partenaire")).toHaveCount(0);
});

test("solo : lien direct sans prénom redirige vers /create", async ({ page }) => {
  await page.goto("/solo?poses=3&mode=classic");
  await expect(page).toHaveURL(/\/create$/);
});
