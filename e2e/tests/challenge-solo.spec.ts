import { test, expect } from "@playwright/test";

// Challenge stickers en solo (docs/STICKER-CHALLENGES.md) : capture 100%
// locale, sans room ni WebRTC — premier test de la suite à un seul contexte
// de navigateur (pas de pair à connecter).
test("challenge solo : caméra prête → sticker affiché → bande composée", async ({ page }) => {
  await page.goto("/solo?poses=3&frame=classic&mode=challenge&pack=cats&name=Testeur");

  await expect(page.getByRole("button", { name: "Lancer le challenge" })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Lancer le challenge" }).click();

  await expect(page.getByText("Modèle")).toBeVisible({ timeout: 15_000 });

  // Timeout large, comme challenge-duo.spec.ts : la phase de lecture
  // (config.challenge.revealMs) ajoute plusieurs secondes par pose.
  await expect(page.getByText("bande est prête")).toBeVisible({ timeout: 40_000 });

  // Aucun texte lié à un partenaire ne doit jamais apparaître en solo.
  await expect(page.getByText("Partenaire")).toHaveCount(0);
});
