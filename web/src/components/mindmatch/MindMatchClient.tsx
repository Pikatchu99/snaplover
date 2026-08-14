"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useMindMatchSession } from "@/hooks/use-mindmatch-session";
import { MindMatchLobby } from "@/components/mindmatch/MindMatchLobby";
import { MindMatchRoundStage } from "@/components/mindmatch/MindMatchRoundStage";
import { FaceBubbles } from "@/components/room/FaceBubbles";
import { MindMatchRecap } from "@/components/mindmatch/MindMatchRecap";

interface MindMatchClientProps {
  code: string;
}

// Orchestrateur d'une room Mind Match — même squelette que DuelClient.tsx
// (connexion → salle d'attente → partie → récap).
export function MindMatchClient({ code }: MindMatchClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("mindMatchRound");

  const session = useMindMatchSession({ dataChannel });

  useEffect(() => {
    // Vie privée : une fois la partie terminée, plus besoin de la caméra —
    // même précaution que DuelClient.tsx/RoomClient.tsx.
    if (session.phase === "recap" && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [session.phase, localStream]);

  if (session.hasStarted) {
    if (session.phase === "recap") {
      return <MindMatchRecap rounds={session.rounds} onReplay={session.replay} />;
    }
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        <MindMatchRoundStage session={session} />
      </div>
    );
  }

  return (
    <MindMatchLobby
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
