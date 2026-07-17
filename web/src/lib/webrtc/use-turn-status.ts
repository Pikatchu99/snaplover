import { useQuery } from "@tanstack/react-query";
import type { TurnStatusResponse } from "@/types/webrtc";

async function fetchTurnStatus(): Promise<TurnStatusResponse> {
  const res = await fetch("/api/turn-status");
  if (!res.ok) throw new Error("Failed to fetch TURN status");
  return res.json();
}

// Consulté avant de permettre la création d'une room — voir
// lib/webrtc/turn-quota.ts. staleTime court : contrairement aux creds TURN,
// l'état "bloqué" doit rester réactif si le quota vient d'être relevé.
export function useTurnStatus() {
  return useQuery({
    queryKey: ["turn-status"],
    queryFn: fetchTurnStatus,
    staleTime: 60 * 1000,
  });
}
