"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useWordSonarSession } from "@/hooks/use-word-sonar-session";
import { WordSonarLobby } from "@/components/word-sonar/WordSonarLobby";
import { WordSonarRoundStage } from "@/components/word-sonar/WordSonarRoundStage";
import { FaceBubbles } from "@/components/room/FaceBubbles";
import { WordSonarRecap } from "@/components/word-sonar/WordSonarRecap";

interface WordSonarClientProps {
  code: string;
}

// Orchestrateur d'une room Word Sonar — même squelette que DuelClient.tsx
// (connexion → salle d'attente → partie → récap).
export function WordSonarClient({ code }: WordSonarClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, connectionType, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("wordSonarRound");

  const session = useWordSonarSession({ dataChannel, isInitiator, connectionType });

  useEffect(() => {
    // Vie privée : une fois la partie terminée, plus besoin de la caméra —
    // même précaution que DuelClient.tsx/RoomClient.tsx. Sur une connexion
    // relayée, ça a aussi pour effet de vraiment libérer la bande passante
    // TURN (voir CLAUDE.md "Word Sonar") : couper le flux, pas seulement
    // arrêter la logique de jeu, quelle que soit l'issue (victoire, défaite
    // ou match nul sur timeout).
    if (session.phase === "ended" && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
  }, [session.phase, localStream]);

  if (session.hasStarted) {
    if (session.phase === "ended" && session.result) {
      return <WordSonarRecap result={session.result} onReplay={session.replay} />;
    }
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        {/* key={session.gameId} : repart d'un état local UI vierge (cases de
            tentative) à chaque nouvelle partie, après "Rejouer". */}
        <WordSonarRoundStage key={session.gameId} session={session} isInitiator={isInitiator} />
      </div>
    );
  }

  return (
    <WordSonarLobby
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
