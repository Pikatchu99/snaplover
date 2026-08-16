import { config } from "@/lib/config";

// Fenêtre glissante en mémoire — le VRAI point de contrôle du coût de relais
// TURN (voir CLAUDE.md "Word Sonar"/"Rate-limit TURN") : s'applique à TOUTE
// room (photo + chaque mini-jeu) puisque c'est ICI, à l'émission des creds,
// que le coût réel est engagé — pas dans la logique d'un jeu en particulier.
// Process Node long-lived (voir CLAUDE.md déploiement — jamais serverless
// pour web/), donc cette Map survit bien entre requêtes ; remise à zéro à
// chaque redéploiement, acceptable (même philosophie que les rooms
// éphémères de signaling/, aucune BDD au MVP).
const issuedAtByIp = new Map<string, number[]>();

// true = creds TURN à inclure (sous la limite) ; false = IP au-delà du quota
// pour cette fenêtre — l'appelant doit alors répondre STUN seul, jamais
// bloquer complètement (le direct P2P doit rester possible).
export function shouldIssueTurnCredentials(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - config.turnRateLimit.windowMs;
  const recent = (issuedAtByIp.get(ip) ?? []).filter((timestamp) => timestamp > windowStart);

  if (recent.length >= config.turnRateLimit.maxPerWindow) {
    issuedAtByIp.set(ip, recent);
    return false;
  }

  recent.push(now);
  issuedAtByIp.set(ip, recent);
  return true;
}
