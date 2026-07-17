// Vérifie le quota gratuit du service TURN Metered (usage cumulé de tous les
// utilisateurs de l'app, en Go) — quand il est atteint, on bloque la
// création de nouvelles rooms plutôt que de laisser les gens arriver sur une
// séance dont le relais ne fonctionnera plus. Voir CLAUDE.md "SnapLover TURN
// bandwidth" : le compte gratuit se remplit vite en usage réel.
//
// Fonctionnalité entièrement optionnelle (comme Umami) : sans METERED_APP_NAME
// + METERED_SECRET_KEY + METERED_FREE_QUOTA_GB, on ne bloque jamais rien — pas
// d'avertissement, ce n'est pas une valeur d'infra qui varie par déploiement,
// juste une fonctionnalité absente tant qu'elle n'est pas configurée.

interface MeteredUsageEntry {
  label: string;
  username: string;
  usageInGB: number;
}

interface MeteredUsagePage {
  data: MeteredUsageEntry[];
  has_more: boolean;
}

// Résultat mis en cache en mémoire (process du serveur) — évite d'interroger
// l'API Metered à chaque chargement de /create, son usage ne varie pas
// seconde par seconde.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { checkedAt: number; blocked: boolean } | null = null;

async function fetchTotalUsageGB(appName: string, secretKey: string): Promise<number> {
  let total = 0;
  let page = 1;

  // Pagination bornée par sécurité (voir CLAUDE.md "pas de cap silencieux") :
  // 50 pages à priori largement suffisant, un compte avec plus d'utilisateurs
  // que ça aurait de toute façon largement dépassé n'importe quel quota gratuit.
  const MAX_PAGES = 50;

  while (page <= MAX_PAGES) {
    const url = `https://${appName}.metered.live/api/v2/turn/current_usage_by_user?secretKey=${encodeURIComponent(secretKey)}&page=${page}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Metered usage API HTTP ${response.status}: ${body}`);
    }

    const body: MeteredUsagePage = await response.json();
    total += body.data.reduce((sum, entry) => sum + entry.usageInGB, 0);

    if (!body.has_more) break;
    page += 1;
  }

  if (page > MAX_PAGES) {
    console.warn(`[turn-quota] pagination arrêtée à ${MAX_PAGES} pages — total peut être sous-estimé.`);
  }

  return total;
}

// true si le quota gratuit configuré est atteint/dépassé — fail-open (false)
// sur toute config absente ou erreur réseau/API, pour ne jamais bloquer la
// création de room à cause d'un problème de CE check plutôt que du TURN lui-même.
export async function isTurnQuotaExceeded(): Promise<boolean> {
  const appName = process.env.METERED_APP_NAME;
  const secretKey = process.env.METERED_SECRET_KEY;
  const quotaGB = process.env.METERED_FREE_QUOTA_GB ? Number(process.env.METERED_FREE_QUOTA_GB) : null;

  if (!appName || !secretKey || !quotaGB) return false;

  if (cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) return cache.blocked;

  try {
    const totalUsageGB = await fetchTotalUsageGB(appName, secretKey);
    const blocked = totalUsageGB >= quotaGB;
    cache = { checkedAt: Date.now(), blocked };
    return blocked;
  } catch (error) {
    console.error("[turn-quota] échec de la vérification du quota Metered:", error);
    cache = { checkedAt: Date.now(), blocked: false };
    return false;
  }
}
