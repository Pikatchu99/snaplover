"use client";

import { useEffect, useRef, useState } from "react";
import { SignalingClient } from "@/lib/signaling/client";
import { createPeerConnection, type SignalPayload } from "@/lib/webrtc/peer-connection";
import { useIceServers } from "@/lib/webrtc/use-ice-servers";
import { useUserMedia } from "@/hooks/use-user-media";
import type { ServerMessage } from "@/types/signaling";

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL ?? "ws://localhost:8080";

export type RoomConnectionStatus =
  | "requesting-camera"
  | "camera-denied"
  | "waiting-for-peer"
  | "connecting"
  | "connected"
  | "room-full"
  | "invalid-room";

// Orchestration temps réel d'une room : caméra locale → signaling → WebRTC.
// Voir SNAPROOM-SPEC.md §8-§9.
export function useRoomConnection(roomCode: string) {
  const { stream: localStream, status: mediaStatus } = useUserMedia();
  const iceServersQuery = useIceServers();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<RoomConnectionStatus>("requesting-camera");

  const peerRef = useRef<ReturnType<typeof createPeerConnection> | null>(null);

  useEffect(() => {
    if (mediaStatus === "denied") setStatus("camera-denied");
  }, [mediaStatus]);

  useEffect(() => {
    if (!localStream || !iceServersQuery.data) return;

    const signaling = new SignalingClient();
    setStatus("waiting-for-peer");

    function ensurePeerConnection(initiator: boolean) {
      if (peerRef.current || !localStream || !iceServersQuery.data) return;
      setStatus("connecting");

      const peer = createPeerConnection({
        iceServers: iceServersQuery.data.iceServers,
        initiator,
        localStream,
        onRemoteStream: setRemoteStream,
        onConnectionStateChange: (state) => {
          if (state === "connected") setStatus("connected");
          else if (state === "failed" || state === "disconnected" || state === "closed") {
            setStatus("waiting-for-peer");
          }
        },
        sendSignal: (data) => signaling.send({ type: "signal", data }),
      });

      peerRef.current = peer;
      if (initiator) peer.createOffer();
    }

    const unsubscribe = signaling.onMessage((message: ServerMessage) => {
      switch (message.type) {
        case "joined":
          if (message.peers === 2) ensurePeerConnection(message.initiator);
          break;
        case "peer-ready":
          ensurePeerConnection(true);
          break;
        case "signal":
          peerRef.current?.handleSignal(message.data as SignalPayload);
          break;
        case "peer-left":
          peerRef.current?.pc.close();
          peerRef.current = null;
          setRemoteStream(null);
          setStatus("waiting-for-peer");
          break;
        case "full":
          setStatus("room-full");
          break;
        case "invalid-room":
          setStatus("invalid-room");
          break;
      }
    });

    signaling.connect(SIGNALING_URL, roomCode);

    return () => {
      unsubscribe();
      signaling.close();
      peerRef.current?.pc.close();
      peerRef.current = null;
    };
  }, [localStream, iceServersQuery.data, roomCode]);

  return { localStream, remoteStream, status };
}
