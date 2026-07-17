import { test, expect } from "@playwright/test";

// i18n (fr par défaut sans préfixe, en sous /en) — voir web/src/i18n/routing.ts.
test.describe("i18n", () => {
  test("Accept-Language anglais → sert l'anglais sans préfixe demandé", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("photo booth");
    await context.close();
  });

  test("le switch de langue change la locale sans perdre la page courante", async ({ page }) => {
    await page.goto("/create");
    await expect(page.getByRole("heading", { name: "Préparer votre séance" })).toBeVisible();

    // Le libellé du switch lui-même est traduit dans la langue courante
    // ("Langue: EN" tant qu'on est sur la page FR, "Language: FR" une fois
    // sur la page EN) — pas figé dans une langue.
    await page.getByRole("button", { name: /Langue: EN/ }).click();
    await expect(page).toHaveURL(/\/en\/create$/);
    await expect(page.getByRole("heading", { name: "Prepare your session" })).toBeVisible();

    await page.getByRole("button", { name: /Language: FR/ }).click();
    await expect(page).toHaveURL(/\/create$/);
    await expect(page.getByRole("heading", { name: "Préparer votre séance" })).toBeVisible();
  });
});
