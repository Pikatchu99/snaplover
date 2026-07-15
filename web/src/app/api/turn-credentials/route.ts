import { NextResponse } from "next/server";
import { buildIceServers } from "@/lib/webrtc/turn-credentials";
import type { TurnCredentialsResponse } from "@/types/webrtc";

// Les creds TURN sont éphémères/dépendantes de l'heure — jamais mises en cache statique.
export const dynamic = "force-dynamic";

export async function GET() {
  const body: TurnCredentialsResponse = { iceServers: buildIceServers() };
  return NextResponse.json(body);
}
