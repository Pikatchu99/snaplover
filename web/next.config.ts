import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome (server.js + dépendances minimales) pour self-hosting en
  // Docker sur le VPS — voir docs/DEPLOY.md et web/Dockerfile. Sans effet sur
  // `pnpm dev`.
  output: "standalone",
  // Racine du monorepo (pnpm-workspace.yaml) explicite : sans ça, Next.js la
  // déduit du chemin absolu de la machine et imbrique .next/standalone sous
  // ce chemin complet (ex. Workspace/Personal/web/snaproom/web/server.js) —
  // imprévisible et cassé une fois dans un conteneur Docker, où le chemin
  // absolu diffère. Fixe aussi l'avertissement "workspace root" au build.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
