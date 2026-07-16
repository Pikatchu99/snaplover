"use client";

import { useState, type RefObject } from "react";
import { Check, Copy } from "lucide-react";
import { CameraTile, type CameraTileState } from "@/components/room/CameraTile";
import type { RoomConnectionStatus } from "@/hooks/use-room-connection";

interface LobbyProps {
  roomCode: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: RoomConnectionStatus;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  isInitiator: boolean;
  onLaunch: () => void;
}

const STATUS_LABEL: Record<RoomConnectionStatus, string> = {
  "requesting-camera": "Activation de votre caméra…",
  "camera-denied": "Caméra bloquée",
  "waiting-for-peer": "En attente de votre partenaire…",
  connecting: "Connexion en cours…",
  connected: "2 connectés · caméras prêtes",
  "room-full": "Cette room est déjà à deux",
  "invalid-room": "Code de room invalide",
};

function localTileState(status: RoomConnectionStatus): CameraTileState {
  if (status === "camera-denied") return "off";
  if (status === "requesting-camera") return "connecting";
  return "ready";
}

function remoteTileState(status: RoomConnectionStatus, hasRemoteStream: boolean): CameraTileState {
  if (hasRemoteStream) return "ready";
  if (status === "connecting") return "connecting";
  return "off";
}

function RoomShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#161319] px-4 py-12">
      {children}
    </div>
  );
}

export function Lobby({
  roomCode,
  localStream,
  remoteStream,
  status,
  localVideoRef,
  isInitiator,
  onLaunch,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "camera-denied") {
    return (
      <RoomShell>
        <p className="max-w-sm text-center text-white">
          Caméra bloquée. Autorisez l&apos;accès à votre caméra dans les réglages de votre
          navigateur, puis rechargez la page.
        </p>
      </RoomShell>
    );
  }

  if (status === "room-full") {
    return (
      <RoomShell>
        <p className="max-w-sm text-center text-white">
          SnapRoom, c&apos;est à deux — cette room est déjà complète.
        </p>
      </RoomShell>
    );
  }

  if (status === "invalid-room") {
    return (
      <RoomShell>
        <p className="max-w-sm text-center text-white">
          Cette room a expiré ou le code est incorrect.
        </p>
      </RoomShell>
    );
  }

  return (
    <RoomShell>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl font-bold text-white">Salle d&apos;attente</h1>
        <button
          onClick={copyCode}
          className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 font-mono text-sm text-white/90 transition hover:bg-white/10"
        >
          {roomCode}
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
        <p className="text-sm text-white/60">{STATUS_LABEL[status]}</p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        <CameraTile
          stream={localStream}
          label="Vous"
          state={localTileState(status)}
          mirrored
          muted
          videoRef={localVideoRef}
        />
        <CameraTile
          stream={remoteStream}
          label="Partenaire"
          state={remoteTileState(status, Boolean(remoteStream))}
        />
      </div>

      {isInitiator && status === "connected" && (
        <button
          onClick={onLaunch}
          className="rounded-full bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          Lancer la séance
        </button>
      )}
    </RoomShell>
  );
}
