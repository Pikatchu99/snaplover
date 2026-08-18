"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useBingoSession } from "@/hooks/use-bingo-session";
import { BingoLobby } from "@/components/bingo/BingoLobby";
import { BingoRoundStage } from "@/components/bingo/BingoRoundStage";
import { BingoRecap } from "@/components/bingo/BingoRecap";
import { FaceBubbles } from "@/components/room/FaceBubbles";

interface BingoClientProps {
  code: string;
}

// Orchestrateur d'une room Bingo — même squelette que les autres jeux
// (connexion → salle d'attente → partie → récap).
export function BingoClient({ code }: BingoClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("bingoRound");

  const session = useBingoSession({ dataChannel, isInitiator });

  useEffect(() => {
    // Vie privée : une fois la partie terminée, plus besoin de la caméra —
    // même précaution que les autres jeux à écran de récap séparé.
    if (session.phase === "recap" && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [session.phase, localStream]);

  if (session.hasStarted) {
    if (session.phase === "recap") {
      return <BingoRecap rounds={session.rounds} isInitiator={isInitiator} onReplay={session.replay} />;
    }
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        <BingoRoundStage key={session.round} session={session} />
      </div>
    );
  }

  return (
    <BingoLobby
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
