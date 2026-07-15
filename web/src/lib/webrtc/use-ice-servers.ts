import { useQuery } from "@tanstack/react-query";
import type { TurnCredentialsResponse } from "@/types/webrtc";

async function fetchIceServers(): Promise<TurnCredentialsResponse> {
  const res = await fetch("/api/turn-credentials");
  if (!res.ok) throw new Error("Failed to fetch TURN credentials");
  return res.json();
}

export function useIceServers() {
  return useQuery({
    queryKey: ["turn-credentials"],
    queryFn: fetchIceServers,
    staleTime: 30 * 60 * 1000,
  });
}
