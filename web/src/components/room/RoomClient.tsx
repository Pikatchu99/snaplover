"use client";

import { useRoomConnection } from "@/hooks/use-room-connection";
import { Lobby } from "@/components/room/Lobby";

export function RoomClient({ code }: { code: string }) {
  const { localStream, remoteStream, status } = useRoomConnection(code);
  return <Lobby roomCode={code} localStream={localStream} remoteStream={remoteStream} status={status} />;
}
