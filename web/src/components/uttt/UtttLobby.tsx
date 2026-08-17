"use client";

import { useState, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { CameraTile, type CameraTileState } from "@/components/room/CameraTile";
import { UtttTutorial } from "@/components/uttt/UtttTutorial";
import type { RoomConnectionStatus } from "@/hooks/use-room-connection";
import { Link, getPathname } from "@/i18n/navigation";

interface UtttLobbyProps {
  roomCode: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: RoomConnectionStatus;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  onRetryCamera: () => void;
  tutorialDismissed: boolean;
  onTutorialDismissedChange: (dismissed: boolean) => void;
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

function UtttShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#161319] px-5 pt-16 pb-16">{children}</div>;
}

// Salle d'attente la plus simple des jeux du hub (voir CLAUDE.md "Ultimate
// Tic-Tac-Toe") : aucun bouton "Lancer la partie" — la partie démarre
// automatiquement dès que les deux côtés ont confirmé s'écouter (voir
// hooks/use-uttt-session.ts "uttt-ready"), rien à configurer.
export function UtttLobby({
  roomCode,
  localStream,
  remoteStream,
  status,
  localVideoRef,
  onRetryCamera,
  tutorialDismissed,
  onTutorialDismissedChange,
}: UtttLobbyProps) {
  const t = useTranslations("utttLobby");
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
    const path = getPathname({ href: `/uttt/r/${roomCode}`, locale });
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "camera-denied") {
    return (
      <UtttShell>
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
      </UtttShell>
    );
  }

  if (status === "room-full") {
    return (
      <UtttShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("roomFullMessage")}</p>
          <Link href="/uttt" className={CTA_LINK_CLASS}>
            {t("roomFullCta")}
          </Link>
        </div>
      </UtttShell>
    );
  }

  if (status === "turn-unavailable") {
    return (
      <UtttShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("turnUnavailableMessage")}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("retry")}
          </button>
        </div>
      </UtttShell>
    );
  }

  if (status === "invalid-room") {
    return (
      <UtttShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-white">{t("invalidRoomMessage")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/uttt"
              className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t("invalidRoomCreateCta")}
            </Link>
            <Link href="/uttt/join" className={CTA_LINK_CLASS}>
              {t("invalidRoomJoinCta")}
            </Link>
          </div>
        </div>
      </UtttShell>
    );
  }

  // Tutoriel de règles — retour utilisateur explicite ("je comprends pas
  // les règles") après un premier test. Affiché automatiquement dès la
  // connexion, tant qu'il n'a pas été vu (voir CLAUDE.md "Ultimate
  // Tic-Tac-Toe") ; les caméras restent visibles pendant le tutoriel, même
  // principe que le tutoriel du mode Challenge (components/room/Lobby.tsx).
  // Tant que je n'ai pas moi-même fermé ce tutoriel, mon propre
  // "uttt-ready" n'est jamais envoyé (voir hooks/use-uttt-session.ts
  // `readyToStart`) — la partie ne peut donc jamais démarrer avant que les
  // deux aient vu les règles.
  if (status === "connected" && !tutorialDismissed) {
    return (
      <UtttShell>
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <CameraTile stream={localStream} label={t("you")} state={localTileState(status)} mirrored muted videoRef={localVideoRef} />
            <CameraTile stream={remoteStream} label={t("partner")} state={remoteTileState(status, Boolean(remoteStream))} />
          </div>
          <UtttTutorial onDismiss={() => onTutorialDismissedChange(true)} />
        </div>
      </UtttShell>
    );
  }

  return (
    <UtttShell>
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
          {tutorialDismissed && (
            <button
              onClick={() => onTutorialDismissedChange(false)}
              className="mt-2 text-sm text-[#fb5a46] underline-offset-2 hover:underline"
            >
              {t("reviewRules")}
            </button>
          )}
        </div>

        <p className="text-center text-sm text-white/50">{t("autoStart")}</p>

        <Link href="/" className="text-center text-sm text-white/40 underline-offset-2 hover:text-white/70 hover:underline">
          {tCommon("backToHome")}
        </Link>
      </div>
    </UtttShell>
  );
}
