"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useDuelSession } from "@/hooks/use-duel-session";
import { DuelLobby } from "@/components/duel/DuelLobby";
import { DuelRoundStage } from "@/components/duel/DuelRoundStage";
import { DuelRecap } from "@/components/duel/DuelRecap";

interface DuelClientProps {
  code: string;
}

// Orchestrateur d'une room Doodle Duel — même squelette que RoomClient.tsx
// (connexion → salle d'attente → partie → récap), mais sans rien de propre à
// la photo : pas de prénom échangé, pas de config poses/cadre/style (voir
// CLAUDE.md "Doodle Duel" pour le choix de scope de ce MVP).
export function DuelClient({ code }: DuelClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const locale = useLocale();

  const duel = useDuelSession({ dataChannel, isInitiator, locale });

  if (duel.hasStarted) {
    if (duel.phase === "recap") {
      return <DuelRecap rounds={duel.rounds} onReplay={duel.replay} />;
    }
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <DuelRoundStage duel={duel} />
      </div>
    );
  }

  return (
    <DuelLobby
      roomCode={code}
      localStream={localStream}
      remoteStream={remoteStream}
      status={status}
      localVideoRef={localVideoRef}
      isInitiator={isInitiator}
      onLaunch={duel.startDrawerPrep}
      onRetryCamera={retryCamera}
    />
  );
}
