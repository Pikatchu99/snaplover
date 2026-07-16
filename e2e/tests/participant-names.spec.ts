import { test, expect } from "@playwright/test";

// Prénoms saisis sur /create et /join, échangés via le handshake hello/config
// du data channel (voir use-capture-session.ts) et affichés dans le footer
// de la bande composée. Le lien copié par /create ne doit JAMAIS contenir le
// prénom de l'hôte (privé à son navigateur) — seulement poses/style/cadre.
test("prénoms saisis sur create/join → footer de la bande composée", async ({ browser }) => {
  const contextA = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  const consoleErrors: string[] = [];
  a.on("pageerror", (err) => consoleErrors.push(`[A] ${err.message}`));
  b.on("pageerror", (err) => consoleErrors.push(`[B] ${err.message}`));

  await a.goto("/create");
  await a.getByLabel("Votre prénom").fill("Alice");
  await a.getByRole("button", { name: "Créer et copier le lien" }).click();
  await a.waitForURL(/\/r\//);

  // Le lien copié dans le presse-papier ne doit pas contenir le prénom.
  const clipboard = await a.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).not.toContain("Alice");
  expect(clipboard).toMatch(/\/r\/[A-Z0-9]+\?poses=\d+&style=\w+&frame=\w+$/);

  const code = new URL(a.url()).pathname.split("/").pop();

  await b.goto("/join");
  await b.getByLabel("Rejoindre sa room").fill(code!);
  await b.getByLabel("Votre prénom").fill("Bob");
  await b.getByRole("button", { name: "Rejoindre" }).click();
  await b.waitForURL(/\/r\//);

  await expect(a.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("2 connectés")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la séance" });
  if (await launchA.isVisible().catch(() => false)) await launchA.click();
  else await b.getByRole("button", { name: "Lancer la séance" }).click();

  await expect(a.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });
  await expect(b.getByText("bande est prête")).toBeVisible({ timeout: 25_000 });

  const stripDataUrl = await a.locator('img[alt="Bande photo composée"]').getAttribute("src");
  expect(stripDataUrl).toMatch(/^data:image\/png;base64,/);
  expect(consoleErrors).toEqual([]);

  await contextA.close();
  await contextB.close();
});
