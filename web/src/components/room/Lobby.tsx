"use client";

import { useState, type RefObject } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { CameraTile, type CameraTileState } from "@/components/room/CameraTile";
import type { RoomConnectionStatus } from "@/hooks/use-room-connection";
import { fr } from "@/i18n/messages";
import type { FrameId, StripStyle } from "@/types/frame";

interface LobbyProps {
  roomCode: string;
  // Config de room courante — nécessaire pour reconstruire un lien de
  // partage complet (voir copyLink ci-dessous), pas seulement le code.
  poses: number;
  frameId: FrameId;
  style: StripStyle;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: RoomConnectionStatus;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  isInitiator: boolean;
  onLaunch: () => void;
  onRetryCamera: () => void;
}

const STATUS_LABEL: Record<RoomConnectionStatus, string> = {
  "requesting-camera": fr.lobby.status.requestingCamera,
  "camera-denied": fr.lobby.status.cameraDenied,
  "waiting-for-peer": fr.lobby.status.waitingForPeer,
  connecting: fr.lobby.status.connecting,
  connected: fr.lobby.status.connected,
  reconnecting: fr.lobby.status.reconnecting,
  "room-full": fr.lobby.status.roomFull,
  "invalid-room": fr.lobby.status.invalidRoom,
};

function localTileState(status: RoomConnectionStatus): CameraTileState {
  if (status === "camera-denied") return "off";
  if (status === "requesting-camera") return "connecting";
  return "ready";
}

function remoteTileState(status: RoomConnectionStatus, hasRemoteStream: boolean): CameraTileState {
  if (hasRemoteStream) return "ready";
  if (status === "connecting" || status === "reconnecting") return "connecting";
  return "off";
}

const CTA_LINK_CLASS =
  "inline-flex items-center justify-center rounded-2xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10";

function RoomShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#161319] px-5 py-6">{children}</div>;
}

export function Lobby({
  roomCode,
  poses,
  frameId,
  style,
  localStream,
  remoteStream,
  status,
  localVideoRef,
  isInitiator,
  onLaunch,
  onRetryCamera,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    // Le lien copié ici doit être directement partageable — jamais juste le
    // code brut, qui seul ne permet pas de rejoindre avec la bonne config.
    const params = new URLSearchParams({ poses: String(poses), style, frame: frameId });
    await navigator.clipboard.writeText(`${window.location.origin}/r/${roomCode}?${params.toString()}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "camera-denied") {
    return (
      <RoomShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{fr.lobby.cameraDeniedMessage}</p>
          <p className="max-w-sm text-sm text-white/60">{fr.lobby.cameraDeniedHelp}</p>
          <button
            onClick={onRetryCamera}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {fr.lobby.retry}
          </button>
        </div>
      </RoomShell>
    );
  }

  if (status === "room-full") {
    return (
      <RoomShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{fr.lobby.roomFullMessage}</p>
          <Link href="/create" className={CTA_LINK_CLASS}>
            {fr.lobby.roomFullCta}
          </Link>
        </div>
      </RoomShell>
    );
  }

  if (status === "invalid-room") {
    return (
      <RoomShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{fr.lobby.invalidRoomMessage}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              {fr.lobby.invalidRoomCreateCta}
            </Link>
            <Link href="/join" className={CTA_LINK_CLASS}>
              {fr.lobby.invalidRoomJoinCta}
            </Link>
          </div>
        </div>
      </RoomShell>
    );
  }

  return (
    <RoomShell>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-white">{fr.lobby.title}</h1>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 font-mono text-sm text-white/90 transition hover:bg-white/10"
          >
            {roomCode}
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>

        <p className="text-sm text-white/60">{STATUS_LABEL[status]}</p>

        <div className="grid flex-1 grid-cols-2 gap-4">
          <CameraTile
            stream={localStream}
            label={fr.lobby.you}
            state={localTileState(status)}
            mirrored
            muted
            videoRef={localVideoRef}
          />
          <CameraTile
            stream={remoteStream}
            label={fr.lobby.partner}
            state={remoteTileState(status, Boolean(remoteStream))}
          />
        </div>

        {isInitiator && (
          <button
            onClick={onLaunch}
            disabled={status !== "connected"}
            className="w-full rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90 disabled:from-white/15 disabled:to-white/15 disabled:text-white/50"
          >
            {fr.lobby.launch}
          </button>
        )}
      </div>
    </RoomShell>
  );
}
