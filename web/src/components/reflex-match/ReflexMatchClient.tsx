"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useReflexMatchSession } from "@/hooks/use-reflex-match-session";
import { ReflexMatchLobby } from "@/components/reflex-match/ReflexMatchLobby";
import { ReflexMatchRoundStage } from "@/components/reflex-match/ReflexMatchRoundStage";
import { ReflexMatchRecap } from "@/components/reflex-match/ReflexMatchRecap";
import { FaceBubbles } from "@/components/room/FaceBubbles";

interface ReflexMatchClientProps {
  code: string;
}

// Orchestrateur d'une room Reflex Match — même squelette que les autres
// jeux (connexion → salle d'attente → partie → récap).
export function ReflexMatchClient({ code }: ReflexMatchClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("reflexMatchRound");

  const session = useReflexMatchSession({ dataChannel, isInitiator });

  useEffect(() => {
    // Vie privée : une fois la partie terminée, plus besoin de la caméra —
    // même précaution que les autres jeux à écran de récap séparé.
    if (session.phase === "recap" && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [session.phase, localStream]);

  if (session.hasStarted) {
    if (session.phase === "recap") {
      return <ReflexMatchRecap rounds={session.rounds} isInitiator={isInitiator} onReplay={session.replay} />;
    }
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        <ReflexMatchRoundStage key={session.round} session={session} />
      </div>
    );
  }

  return (
    <ReflexMatchLobby
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
