import { defineConfig } from "@playwright/test";

// Ports dédiés aux tests (différents de ceux du dev quotidien, 3000/8080) —
// évite toute collision si `pnpm dev` tourne déjà en parallèle.
const WEB_PORT = 3100;
const SIGNALING_PORT = 8090;

// Même règle que le reste du repo (voir CLAUDE.md "Aucune valeur d'infra en
// dur") : on lit l'env, on avertit si on retombe sur une valeur par défaut —
// jamais un fallback silencieux, même ici en config de test.
const STUN_URLS = process.env.STUN_URLS;
if (!STUN_URLS) {
  console.warn("[e2e] STUN_URLS non défini — fallback sur le STUN Google public pour cette run de tests.");
}

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // Un seul worker : les tests partagent les mêmes serveurs dev (web +
  // signaling) et font de la vraie synchro WebRTC temps réel — plusieurs
  // navigateurs Chromium concurrents se disputent le CPU et rendaient les
  // délais de synchro/reconnexion flaky. La priorité ici est la fiabilité,
  // pas la vitesse d'exécution.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--mute-audio",
      ],
    },
  },
  webServer: [
    {
      command: "pnpm --filter signaling dev",
      cwd: "..",
      port: SIGNALING_PORT,
      env: { PORT: String(SIGNALING_PORT) },
      reuseExistingServer: false,
      timeout: 20_000,
    },
    {
      command: `pnpm --filter web exec next dev --port ${WEB_PORT}`,
      cwd: "..",
      // Un simple check TCP (`port:`) considère le serveur prêt dès que Next
      // écoute, mais Turbopack compile chaque route à la demande — la toute
      // première navigation vers /r/[code] pouvait tomber sur un 404 le temps
      // que la route dynamique finisse de compiler. `url:` force Playwright à
      // attendre une vraie réponse sur cette route précise, ce qui déclenche
      // et attend sa compilation avant que les tests ne démarrent.
      url: `http://localhost:${WEB_PORT}/r/WARMUP`,
      env: {
        NEXT_PUBLIC_SIGNALING_URL: `ws://localhost:${SIGNALING_PORT}`,
        STUN_URLS: STUN_URLS ?? "stun:stun.l.google.com:19302",
      },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
