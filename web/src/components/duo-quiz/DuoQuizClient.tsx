"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useDuoQuizSession } from "@/hooks/use-duo-quiz-session";
import { DuoQuizLobby } from "@/components/duo-quiz/DuoQuizLobby";
import { DuoQuizRound } from "@/components/duo-quiz/DuoQuizRound";
import { DuoQuizRecap } from "@/components/duo-quiz/DuoQuizRecap";
import { FaceBubbles } from "@/components/room/FaceBubbles";

interface DuoQuizClientProps {
  code: string;
}

// Orchestrateur d'une room Duo Quiz — même squelette que les autres jeux
// (connexion → salle d'attente → partie → récap).
export function DuoQuizClient({ code }: DuoQuizClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("duoQuizRound");

  const session = useDuoQuizSession({ dataChannel, isInitiator });

  useEffect(() => {
    // Vie privée : une fois la partie terminée, plus besoin de la caméra —
    // même précaution que les autres jeux à écran de récap séparé.
    if (session.phase === "recap" && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [session.phase, localStream]);

  if (session.hasStarted) {
    if (session.phase === "recap") {
      return <DuoQuizRecap rounds={session.rounds} scores={session.scores} isInitiator={isInitiator} onReplay={session.replay} />;
    }
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        <DuoQuizRound key={session.roundIndex} session={session} isInitiator={isInitiator} />
      </div>
    );
  }

  return (
    <DuoQuizLobby
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
