"use client";

import { useState, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { CameraTile, type CameraTileState } from "@/components/room/CameraTile";
import type { RoomConnectionStatus } from "@/hooks/use-room-connection";
import { WordSonarLengthPicker } from "@/components/word-sonar/WordSonarLengthPicker";
import { Link, getPathname } from "@/i18n/navigation";

interface WordSonarLobbyProps {
  roomCode: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: RoomConnectionStatus;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  isInitiator: boolean;
  onLaunch: (length: number) => void;
  onRetryCamera: () => void;
}

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

function WordSonarShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#161319] px-5 pt-16 pb-16">{children}</div>;
}

// Salle d'attente de connexion — même structure d'états que duel/DuelLobby.tsx
// (caméra bloquée/room pleine/relais indisponible/lien invalide). Seule
// différence : l'hôte choisit ici la longueur du mot avant de lancer (voir
// hooks/use-word-sonar-session.ts "launch") — un réglage que Doodle Duel et
// Mind Match n'ont pas besoin de demander.
export function WordSonarLobby({
  roomCode,
  localStream,
  remoteStream,
  status,
  localVideoRef,
  isInitiator,
  onLaunch,
  onRetryCamera,
}: WordSonarLobbyProps) {
  const t = useTranslations("wordSonarLobby");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const STATUS_LABEL: Record<RoomConnectionStatus, string> = {
    "requesting-camera": t("status.requestingCamera"),
    "camera-denied": t("status.cameraDenied"),
    "waiting-for-peer": t("status.waitingForPeer"),
    connecting: t("status.connecting"),
    connected: t("status.connected"),
    reconnecting: t("status.reconnecting"),
    "room-full": t("status.roomFull"),
    "invalid-room": t("status.invalidRoom"),
    "turn-unavailable": t("status.turnUnavailable"),
  };

  async function copyLink() {
    const path = getPathname({ href: `/word-sonar/r/${roomCode}`, locale });
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "camera-denied") {
    return (
      <WordSonarShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("cameraDeniedMessage")}</p>
          <button
            onClick={onRetryCamera}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("retry")}
          </button>
          <Link href="/" className="text-sm text-white/50 underline-offset-2 hover:text-white/80 hover:underline">
            {tCommon("backToHome")}
          </Link>
        </div>
      </WordSonarShell>
    );
  }

  if (status === "room-full") {
    return (
      <WordSonarShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("roomFullMessage")}</p>
          <Link href="/word-sonar" className={CTA_LINK_CLASS}>
            {t("roomFullCta")}
          </Link>
        </div>
      </WordSonarShell>
    );
  }

  if (status === "turn-unavailable") {
    return (
      <WordSonarShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("turnUnavailableMessage")}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("retry")}
          </button>
        </div>
      </WordSonarShell>
    );
  }

  if (status === "invalid-room") {
    return (
      <WordSonarShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("invalidRoomMessage")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/word-sonar"
              className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t("invalidRoomCreateCta")}
            </Link>
            <Link href="/word-sonar/join" className={CTA_LINK_CLASS}>
              {t("invalidRoomJoinCta")}
            </Link>
          </div>
        </div>
      </WordSonarShell>
    );
  }

  return (
    <WordSonarShell>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-white">{t("title")}</h1>
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
          <CameraTile stream={localStream} label={t("you")} state={localTileState(status)} mirrored muted videoRef={localVideoRef} />
          <CameraTile stream={remoteStream} label={t("partner")} state={remoteTileState(status, Boolean(remoteStream))} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{t("rulesTitle")}</p>
          <p className="mt-1 text-sm text-white/80">{t("rulesText")}</p>
        </div>

        {isInitiator ? (
          <WordSonarLengthPicker onLaunch={onLaunch} disabled={status !== "connected"} />
        ) : (
          <p className="text-center text-sm text-white/50">{t("waitingForHost")}</p>
        )}

        <Link href="/" className="text-center text-sm text-white/40 underline-offset-2 hover:text-white/70 hover:underline">
          {tCommon("backToHome")}
        </Link>
      </div>
    </WordSonarShell>
  );
}
