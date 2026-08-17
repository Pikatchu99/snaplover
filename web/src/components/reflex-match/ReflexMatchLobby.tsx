"use client";

import { useState, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { CameraTile, type CameraTileState } from "@/components/room/CameraTile";
import type { RoomConnectionStatus } from "@/hooks/use-room-connection";
import { Link, getPathname } from "@/i18n/navigation";

interface ReflexMatchLobbyProps {
  roomCode: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: RoomConnectionStatus;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  isInitiator: boolean;
  onLaunch: () => void;
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

function ReflexMatchShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#161319] px-5 pt-16 pb-16">{children}</div>;
}

// Salle d'attente — même structure d'états que les autres jeux (caméra
// bloquée/room pleine/relais indisponible/lien invalide). Bouton "Lancer la
// partie" explicite (voir CLAUDE.md "Reflex Match") : ce clic humain
// garantit déjà que l'invité·e écoute au moment du lancement, comme pour
// Copy Cat/Connect Duo.
export function ReflexMatchLobby({
  roomCode,
  localStream,
  remoteStream,
  status,
  localVideoRef,
  isInitiator,
  onLaunch,
  onRetryCamera,
}: ReflexMatchLobbyProps) {
  const t = useTranslations("reflexMatchLobby");
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
    const path = getPathname({ href: `/reflex-match/r/${roomCode}`, locale });
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "camera-denied") {
    return (
      <ReflexMatchShell>
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
      </ReflexMatchShell>
    );
  }

  if (status === "room-full") {
    return (
      <ReflexMatchShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("roomFullMessage")}</p>
          <Link href="/reflex-match" className={CTA_LINK_CLASS}>
            {t("roomFullCta")}
          </Link>
        </div>
      </ReflexMatchShell>
    );
  }

  if (status === "turn-unavailable") {
    return (
      <ReflexMatchShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("turnUnavailableMessage")}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("retry")}
          </button>
        </div>
      </ReflexMatchShell>
    );
  }

  if (status === "invalid-room") {
    return (
      <ReflexMatchShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("invalidRoomMessage")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/reflex-match"
              className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t("invalidRoomCreateCta")}
            </Link>
            <Link href="/reflex-match/join" className={CTA_LINK_CLASS}>
              {t("invalidRoomJoinCta")}
            </Link>
          </div>
        </div>
      </ReflexMatchShell>
    );
  }

  return (
    <ReflexMatchShell>
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
          <button
            onClick={onLaunch}
            disabled={status !== "connected"}
            className="w-full rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90 disabled:from-white/15 disabled:to-white/15 disabled:text-white/50"
          >
            {t("launch")}
          </button>
        ) : (
          <p className="text-center text-sm text-white/50">{t("waitingForHost")}</p>
        )}

        <Link href="/" className="text-center text-sm text-white/40 underline-offset-2 hover:text-white/70 hover:underline">
          {tCommon("backToHome")}
        </Link>
      </div>
    </ReflexMatchShell>
  );
}
