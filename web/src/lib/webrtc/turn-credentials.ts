import { createHmac } from "node:crypto";
import { config } from "@/lib/config";
import type { IceServer } from "@/types/webrtc";

// TURN REST API (https://tools.ietf.org/id/draft-uberti-behave-turn-rest-00.html) :
// creds courtes durées dérivées d'un secret partagé, jamais le secret durable exposé au client.
function ephemeralCredentials(turnUrls: string[], secret: string): IceServer[] {
  const username = `${Math.floor(Date.now() / 1000) + config.turnEphemeral.ttlSeconds}:${config.turnEphemeral.label}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  return [{ urls: turnUrls, username, credential }];
}

function staticCredentials(turnUrls: string[], username: string, credential: string): IceServer[] {
  return [{ urls: turnUrls, username, credential }];
}

// Construit la liste iceServers pour le client : STUN + TURN, tous deux
// configurés via env (voir .env.example) — aucune adresse d'infra en dur ici.
// Voir SNAPROOM-SPEC.md §11 — jamais de secret TURN durable dans le bundle client,
// cette fonction ne doit être appelée que côté serveur (route handler).
// `includeTurn` (voir lib/webrtc/turn-rate-limit.ts) : au-delà du quota par IP,
// on continue de répondre avec STUN seul plutôt que de bloquer l'app — le
// direct P2P reste possible, seul le relais (le vrai coût) est coupé.
export function buildIceServers(includeTurn = true): IceServer[] {
  const stunUrls = (process.env.STUN_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (stunUrls.length === 0) {
    console.warn("STUN_URLS not set — no STUN server configured, only direct/relay candidates will work.");
  }

  const iceServers: IceServer[] = stunUrls.length > 0 ? [{ urls: stunUrls }] : [];

  if (!includeTurn) return iceServers;

  const turnUrls = (process.env.TURN_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (turnUrls.length === 0) return iceServers;

  if (process.env.TURN_SECRET) {
    iceServers.push(...ephemeralCredentials(turnUrls, process.env.TURN_SECRET));
  } else if (process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push(
      ...staticCredentials(turnUrls, process.env.TURN_USERNAME, process.env.TURN_CREDENTIAL),
    );
  }

  return iceServers;
}
