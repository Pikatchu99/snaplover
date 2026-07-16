import { test, expect } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Un lien collé directement (sans passer par /create ou /join) n'a pas de
// prénom — pas de secours silencieux ("Hôte"/"Invité"), on redirige vers
// /join avec le code pré-rempli pour forcer sa saisie.
test("lien sans prénom → redirection vers /join avec le code pré-rempli", async ({ page }) => {
  const code = randomRoomCode();
  await page.goto(`/r/${code}?poses=3&style=vertical&frame=classic`);

  await expect(page).toHaveURL(new RegExp(`/join\\?code=${code}$`));
  await expect(page.getByRole("textbox", { name: "Rejoindre une séance" })).toHaveValue(code);
});
