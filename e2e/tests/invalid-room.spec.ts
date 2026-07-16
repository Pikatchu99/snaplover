import { test, expect } from "@playwright/test";

// État obligatoire "Lien introuvable / expiré" — SNAPROOM-SPEC.md §12.
// Un code d'1 caractère échoue la regex serveur (^[A-Z0-9]{4,8}$).
test("un code de room malformé affiche l'état invalide avec ses CTA", async ({ page }) => {
  await page.goto("/r/x");

  await expect(page.getByText("expiré ou le code est incorrect")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Créer une room" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Saisir un code" })).toBeVisible();
});
