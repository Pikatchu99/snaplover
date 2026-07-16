import { RoomClient } from "@/components/room/RoomClient";
import { parseRoomConfig } from "@/lib/room-config";

interface RoomPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const { code } = await params;
  const config = parseRoomConfig(await searchParams);
  return <RoomClient code={code.toUpperCase()} poses={config.poses} frameId={config.frameId} style={config.style} />;
}
