import { NextResponse, type NextRequest } from "next/server";
import { buildIceServers } from "@/lib/webrtc/turn-credentials";
import { shouldIssueTurnCredentials } from "@/lib/webrtc/turn-rate-limit";
import type { TurnCredentialsResponse } from "@/types/webrtc";

// Les creds TURN sont éphémères/dépendantes de l'heure — jamais mises en cache statique.
export const dynamic = "force-dynamic";

// `CF-Connecting-IP` : posé par Cloudflare Tunnel (voir CLAUDE.md déploiement)
// avec la vraie IP cliente, plus fiable que `x-forwarded-for` derrière ce
// proxy précis. Fallback sur x-forwarded-for si absent (dev local sans
// tunnel) ; "unknown" regroupe tout le reste dans un seul compteur partagé,
// jamais un blocage silencieux faute d'IP identifiable.
function clientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function GET(request: NextRequest) {
  const includeTurn = shouldIssueTurnCredentials(clientIp(request));
  const body: TurnCredentialsResponse = { iceServers: buildIceServers(includeTurn) };
  return NextResponse.json(body);
}
