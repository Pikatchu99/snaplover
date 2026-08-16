"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useEdgeLettersSession } from "@/hooks/use-edge-letters-session";
import { EdgeLettersLobby } from "@/components/edge-letters/EdgeLettersLobby";
import { EdgeLettersRoundStage } from "@/components/edge-letters/EdgeLettersRoundStage";
import { FaceBubbles } from "@/components/room/FaceBubbles";
import { EdgeLettersRecap } from "@/components/edge-letters/EdgeLettersRecap";

interface EdgeLettersClientProps {
  code: string;
}

// Orchestrateur d'une room Edge Letters — même squelette que les autres jeux
// (connexion → salle d'attente → partie → récap).
export function EdgeLettersClient({ code }: EdgeLettersClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("edgeLettersRound");

  const session = useEdgeLettersSession({ dataChannel, isInitiator });

  useEffect(() => {
    // Vie privée : une fois la partie terminée, plus besoin de la caméra —
    // même précaution que les autres jeux à écran de récap séparé.
    if (session.phase === "recap" && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [session.phase, localStream]);

  if (session.hasStarted) {
    if (session.phase === "recap") {
      return <EdgeLettersRecap rounds={session.rounds} isInitiator={isInitiator} onReplay={session.replay} />;
    }
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        {/* key={session.round} : repart d'un état local UI vierge (saisie de
            mot, retour de validation) à chaque nouvelle manche. */}
        <EdgeLettersRoundStage key={session.round} session={session} isInitiator={isInitiator} />
      </div>
    );
  }

  return (
    <EdgeLettersLobby
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
