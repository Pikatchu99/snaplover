import { NextResponse } from "next/server";
import { isTurnQuotaExceeded } from "@/lib/webrtc/turn-quota";

// Consulté par /create avant d'autoriser la création d'une room — voir
// lib/webrtc/turn-quota.ts. Jamais mis en cache statique (usage vérifié en temps réel).
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await isTurnQuotaExceeded();
  return NextResponse.json({ blocked });
}
