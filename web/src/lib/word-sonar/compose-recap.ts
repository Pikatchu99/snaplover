import type { WordSonarResult } from "@/types/word-sonar";

// Layout fixe (pas de config.ts : purement visuel, jamais retouché en dehors
// d'une passe design) — une seule carte (partie unique, pas de manches) :
// résultat + les deux mots + footer de marque.
const WIDTH = 480;
const HEIGHT = 320;
const MARGIN = 40;

interface ComposeRecapOptions {
  outcomeText: string;
  myWordLabel: string;
  peerWordLabel: string;
  footerText: string;
}

// Composite la carte récap d'une partie Word Sonar : résultat (gagné/perdu/
// match nul), les deux mots révélés, footer de marque — même esprit visuel
// que les autres jeux (lib/doodle-duel/compose-recap.ts), mais une seule
// carte puisqu'il n'y a plus de manches.
export async function composeWordSonarRecap(result: WordSonarResult, options: ComposeRecapOptions): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = result.outcome === "won" ? "#1f9d55" : "#1c1712";
  ctx.font = "800 24px system-ui, sans-serif";
  ctx.fillText(options.outcomeText, canvas.width / 2, 64);

  ctx.fillStyle = "#8c8378";
  ctx.font = "500 14px system-ui, sans-serif";
  ctx.fillText(options.myWordLabel, canvas.width / 2, 130);
  ctx.fillStyle = "#1c1712";
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText(result.myWord, canvas.width / 2, 162);

  ctx.fillStyle = "#8c8378";
  ctx.font = "500 14px system-ui, sans-serif";
  ctx.fillText(options.peerWordLabel, canvas.width / 2, 216);
  ctx.fillStyle = "#1c1712";
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText(result.peerWord ?? "…", canvas.width / 2, 248);

  ctx.fillStyle = "#8c8378";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(options.footerText, canvas.width / 2, canvas.height - MARGIN / 2);

  return canvas.toDataURL("image/png");
}
