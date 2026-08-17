"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useCopyCatSession } from "@/hooks/use-copy-cat-session";
import { CopyCatLobby } from "@/components/copy-cat/CopyCatLobby";
import { CopyCatRoundStage } from "@/components/copy-cat/CopyCatRoundStage";
import { CopyCatRecap } from "@/components/copy-cat/CopyCatRecap";
import { FaceBubbles } from "@/components/room/FaceBubbles";

interface CopyCatClientProps {
  code: string;
}

// Orchestrateur d'une room Copy Cat — même squelette que les autres jeux
// (connexion → salle d'attente → partie → récap).
export function CopyCatClient({ code }: CopyCatClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("copyCatRound");

  const session = useCopyCatSession({ dataChannel, isInitiator });

  useEffect(() => {
    // Vie privée : une fois la partie terminée, plus besoin de la caméra —
    // même précaution que les autres jeux à écran de récap séparé.
    if (session.phase === "recap" && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [session.phase, localStream]);

  if (session.hasStarted) {
    if (session.phase === "recap") {
      return <CopyCatRecap rounds={session.rounds} onReplay={session.replay} />;
    }
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        <CopyCatRoundStage key={session.round} session={session} localStream={localStream} />
      </div>
    );
  }

  return (
    <CopyCatLobby
      roomCode={code}
      localStream={localStream}
      remoteStream={remoteStream}
      status={status}
      localVideoRef={localVideoRef}
      isInitiator={isInitiator}
      onLaunch={session.launch}
      onRetryCamera={retryCamera}
    />
  );
}
