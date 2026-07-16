"use client";

import { useEffect, useRef, useState } from "react";
import { SignalingClient } from "@/lib/signaling/client";
import { createPeerConnection, type SignalPayload } from "@/lib/webrtc/peer-connection";
import { useIceServers } from "@/lib/webrtc/use-ice-servers";
import { useUserMedia } from "@/hooks/use-user-media";
import type { ServerMessage } from "@/types/signaling";

// Aucune valeur d'infra en dur (voir CLAUDE.md) : pas de fallback localhost.
const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL;

export type RoomConnectionStatus =
  | "requesting-camera"
  | "camera-denied"
  | "waiting-for-peer"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "room-full"
  | "invalid-room";

// Orchestration temps réel d'une room : caméra locale → signaling → WebRTC.
// Voir SNAPROOM-SPEC.md §8-§9.
export function useRoomConnection(roomCode: string) {
  const { stream: localStream, status: mediaStatus, retry: retryCamera } = useUserMedia();
  const iceServersQuery = useIceServers();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<RoomConnectionStatus>("requesting-camera");
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);

  const peerRef = useRef<ReturnType<typeof createPeerConnection> | null>(null);
  // Ne doit passer de false à true qu'une seule fois (premier flux caméra
  // obtenu) — voir l'effet de connexion plus bas, qui ne doit se déclencher
  // qu'à cette transition, jamais sur un flux de remplacement ultérieur.
  const hasLocalStream = Boolean(localStream);

  // Une nouvelle caméra (ex. "Reprendre" après un track.stop() en arrivant
  // sur le résultat, voir RoomClient) ne doit JAMAIS rouvrir une connexion —
  // seulement remplacer les pistes de la connexion existante. Sinon on romprait
  // la session en cours et on rejouerait le tirage hôte/invité au signaling
  // (le pair qui rejoint après coup peut se retrouver non-initiateur).
  useEffect(() => {
    if (peerRef.current && localStream) {
      peerRef.current.replaceLocalStream(localStream);
    }
  }, [localStream]);

  useEffect(() => {
    // Boolean(localStream), pas localStream : ne doit se déclencher qu'une
    // seule fois, au tout premier flux caméra obtenu (false → true). Un
    // flux de remplacement plus tard (retryCamera) ne doit pas re-déclencher
    // cet effet — géré séparément ci-dessus via replaceLocalStream.
    if (!localStream || !iceServersQuery.data) return;
    if (peerRef.current) return;

    if (!SIGNALING_URL) {
      console.warn("NEXT_PUBLIC_SIGNALING_URL not set — cannot connect to the signaling server.");
      return;
    }

    const signaling = new SignalingClient();
    // Micro-tâche : reflète le démarrage de la connexion signaling sans
    // déclencher de setState synchrone dans le corps de l'effet.
    queueMicrotask(() => setStatus("waiting-for-peer"));

    function ensurePeerConnection(initiator: boolean) {
      if (peerRef.current || !localStream || !iceServersQuery.data) return;
      setStatus("connecting");
      setIsInitiator(initiator);

      const peer = createPeerConnection({
        iceServers: iceServersQuery.data.iceServers,
        initiator,
        localStream,
        onRemoteStream: setRemoteStream,
        onConnectionStateChange: (state) => {
          if (state === "connected") setStatus("connected");
          else if (state === "disconnected") setStatus("reconnecting");
          else if (state === "failed" || state === "closed") setStatus("waiting-for-peer");
        },
        onDataChannel: setDataChannel,
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
          setDataChannel(null);
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

    // Coupure serveur (pas initiée par nous) : la seule qu'émet le signaling
    // aujourd'hui est le code 4000 (room orpheline expirée, voir server.ts).
    const unsubscribeClose = signaling.onClose((code) => {
      if (code === 4000) setStatus("invalid-room");
    });

    signaling.connect(SIGNALING_URL, roomCode);

    return () => {
      unsubscribe();
      unsubscribeClose();
      signaling.close();
      peerRef.current?.pc.close();
      peerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasLocalStream, pas localStream (voir plus haut)
  }, [hasLocalStream, iceServersQuery.data, roomCode]);

  const effectiveStatus: RoomConnectionStatus = mediaStatus === "denied" ? "camera-denied" : status;

  return { localStream, remoteStream, status: effectiveStatus, dataChannel, isInitiator, retryCamera };
}
