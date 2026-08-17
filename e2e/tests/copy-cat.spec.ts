import { test, expect, type Page } from "@playwright/test";
import { randomRoomCode } from "./helpers";

// Copy Cat — mimicry photobooth à deux, AUCUN chrono nulle part (voir
// hooks/use-copy-cat-session.ts). Chaque manche : un·e seul·e pose (sa
// propre caméra, bouton "Capture" manuel), l'autre reproduit la pose à
// l'aide d'un calque fantôme semi-transparent puis capture à son tour ;
// seul·e qui a posé note le résultat. Le rôle poseur·se alterne à chaque
// manche par pure parité de l'index (poserIsInitiatorForRound), jamais
// transmis. Vérifie une partie complète (4 manches, rôles alternés, deux
// transferts d'image chunkés par manche) jusqu'au récap téléchargeable,
// puis "Rejouer" testé des deux côtés indépendamment (aucun message
// réseau, voir CLAUDE.md "Copy Cat").
test("Copy Cat : 4 manches (rôles alternés, deux transferts d'image par manche) → récap téléchargeable, Rejouer sans reconnexion", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  const room = randomRoomCode();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  await a.goto(`/copy-cat/r/${room}`);
  await b.goto(`/copy-cat/r/${room}`);

  await expect(a.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("prêts à jouer")).toBeVisible({ timeout: 20_000 });

  const launchA = a.getByRole("button", { name: "Lancer la partie" });
  const aIsHost = await launchA.isVisible().catch(() => false);
  const host = aIsHost ? a : b; // hôte = poseur·se de la manche 0 (poserIsInitiatorForRound(0) vrai)
  const guest = aIsHost ? b : a;

  await host.getByRole("button", { name: "Lancer la partie" }).click();

  function poserForRound(round: number): Page {
    return round % 2 === 0 ? host : guest;
  }
  function mimicForRound(round: number): Page {
    return round % 2 === 0 ? guest : host;
  }

  const VERDICTS: Array<"Nailé !" | "Presque" | "Pas tout à fait"> = ["Nailé !", "Presque", "Pas tout à fait", "Nailé !"];

  for (let round = 0; round < 4; round++) {
    const poser = poserForRound(round);
    const mimic = mimicForRound(round);

    await expect(poser.getByText("À toi de poser !")).toBeVisible({ timeout: 15_000 });
    await expect(mimic.getByText("Ton·ta partenaire pose…")).toBeVisible({ timeout: 10_000 });
    await poser.getByRole("button", { name: "Capturer" }).click();

    // Transfert chunké de la référence → le·la mimic bascule sur
    // "mimic-prep" (calque fantôme) UNIQUEMENT à la réception complète
    // (copycat-img-end), jamais sur copycat-img-meta (voir CLAUDE.md).
    await expect(mimic.getByText("Imite la pose")).toBeVisible({ timeout: 15_000 });
    await expect(poser.getByText("Ton·ta partenaire t'imite…")).toBeVisible({ timeout: 10_000 });
    await mimic.getByRole("button", { name: "Capturer" }).click();

    // Révélation automatique dès que les deux clichés existent des deux
    // côtés — aucun message dédié, chaque côté le déduit localement.
    await expect(poser.getByText("Référence")).toBeVisible({ timeout: 15_000 });
    await expect(mimic.getByText("Référence")).toBeVisible({ timeout: 15_000 });

    // Seul·e le·la poseur·se peut noter — l'interface du·de la mimic n'a
    // aucun bouton de verdict à cliquer (pas seulement désactivé).
    await poser.getByRole("button", { name: VERDICTS[round] }).click();
    await expect(mimic.getByText(VERDICTS[round])).toBeVisible({ timeout: 10_000 });

    // "Manche suivante"/"Voir le récap" : n'importe quel côté peut cliquer
    // en premier — alterne qui clique pour vérifier les deux chemins.
    const isLast = round === 3;
    const nextLabel = isLast ? "Voir le récap" : "Manche suivante";
    const clicker = round % 2 === 0 ? mimic : poser;
    await clicker.getByRole("button", { name: nextLabel }).click();
  }

  await expect(host.getByText("Votre récap Copy Cat")).toBeVisible({ timeout: 15_000 });
  await expect(guest.getByText("Votre récap Copy Cat")).toBeVisible({ timeout: 15_000 });
  await expect(host.getByAltText("Récap de la partie Copy Cat")).toBeVisible({ timeout: 10_000 });

  const downloadButton = host.getByRole("button", { name: "Télécharger PNG" });
  await expect(downloadButton).toBeEnabled({ timeout: 15_000 });
  const downloadPromise = host.waitForEvent("download");
  await downloadButton.click();
  await downloadPromise;

  // "Rejouer" — aucun message réseau (voir CLAUDE.md) : chaque côté doit
  // cliquer indépendamment pour revenir à SA PROPRE salle d'attente.
  await host.getByRole("button", { name: "Rejouer" }).click();
  await expect(host.getByText("Salle d'attente")).toBeVisible({ timeout: 10_000 });
  await guest.getByRole("button", { name: "Rejouer" }).click();
  await expect(guest.getByText("Salle d'attente")).toBeVisible({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
