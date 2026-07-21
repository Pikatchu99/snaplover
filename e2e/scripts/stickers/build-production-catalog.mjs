import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Planche de tous les stickers déjà publiés (web/public/stickers/), avec
// leur id affiché — sert à choisir quels ids coller dans
// web/src/lib/stickers/featured-stickers.ts (pool curé du "Pack du jour").
// Contrairement à la gallery de sourcing Pinterest, ici on relit les assets
// déjà en prod, pas des candidats à trier avant publication.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const sourceRoot = path.join(repoRoot, "web", "public", "stickers");
const outputFile = path.join(repoRoot, "sticker-sourcing", "production-catalog.html");

const entries = await collectEntries(sourceRoot);
await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, renderHtml(entries), "utf8");
console.log(`Catalogue écrit dans ${path.relative(repoRoot, outputFile)} (${entries.length} stickers)`);
console.log("Ouvre ce fichier directement dans un navigateur (chemins relatifs, pas besoin de serveur).");

async function collectEntries(root) {
  const packs = await readdir(root, { withFileTypes: true });
  const entries = [];

  for (const pack of packs) {
    if (!pack.isDirectory()) continue;
    const packDir = path.join(root, pack.name);
    const files = await readdir(packDir);
    for (const file of files) {
      if (!file.endsWith(".jpg")) continue;
      entries.push({
        pack: pack.name,
        id: file.replace(/\.jpg$/, ""),
        // Relatif à sticker-sourcing/production-catalog.html — fonctionne en
        // ouverture directe (file://), sans dépendre d'un serveur dev.
        src: `../web/public/stickers/${pack.name}/${file}`,
      });
    }
  }

  return entries.sort((a, b) => a.pack.localeCompare(b.pack) || a.id.localeCompare(b.id));
}

function renderHtml(entries) {
  const cards = entries
    .map(
      (entry) => `      <figure>
        <img src="${entry.src}" loading="lazy" alt="${entry.id}" />
        <figcaption>${entry.pack} / <code>${entry.id}</code></figcaption>
      </figure>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Catalogue stickers (production)</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #161319; color: #fff; margin: 0; padding: 24px; }
      h1 { font-size: 14px; font-weight: 600; opacity: 0.7; margin-bottom: 20px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
      figure { margin: 0; background: #1c1712; border-radius: 12px; padding: 8px; text-align: center; }
      img { width: 100%; aspect-ratio: 1; object-fit: contain; border-radius: 8px; background: #fff; }
      figcaption { font-size: 11px; margin-top: 6px; opacity: 0.8; word-break: break-all; }
      code { color: #fb5a46; }
    </style>
  </head>
  <body>
    <h1>${entries.length} stickers publiés — copie les <code>id</code> qui te plaisent dans featured-stickers.ts</h1>
    <div class="grid">
${cards}
    </div>
  </body>
</html>`;
}
