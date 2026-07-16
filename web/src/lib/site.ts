// URL absolue du site en production — utilisée pour `metadataBase`, les URLs
// canoniques et les URLs absolues Open Graph/Twitter. C'est une valeur d'infra
// qui varie selon le déploiement (voir CLAUDE.md "Aucune valeur d'infra en
// dur") : lue depuis l'env, jamais en dur dans le code source. Une valeur par
// défaut est seulement documentée dans `.env.example`.
const SITE_URL_ENV = process.env.NEXT_PUBLIC_SITE_URL;

if (!SITE_URL_ENV) {
  console.warn(
    "NEXT_PUBLIC_SITE_URL not set — metadataBase and absolute OG/canonical/sitemap URLs will be unavailable.",
  );
}

export const SITE_URL = SITE_URL_ENV;
export const metadataBase = SITE_URL_ENV ? new URL(SITE_URL_ENV) : undefined;
