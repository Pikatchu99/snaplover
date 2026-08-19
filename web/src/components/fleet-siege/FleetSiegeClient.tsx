"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useFleetSiegeSession } from "@/hooks/use-fleet-siege-session";
import { FleetSiegeLobby } from "@/components/fleet-siege/FleetSiegeLobby";
import { FleetSiegePlacementStage } from "@/components/fleet-siege/FleetSiegePlacementStage";
import { FleetSiegeBattleStage } from "@/components/fleet-siege/FleetSiegeBattleStage";
import { FaceBubbles } from "@/components/room/FaceBubbles";

interface FleetSiegeClientProps {
  code: string;
}

// Orchestrateur d'une room Fleet Siege — même squelette que les autres jeux
// (connexion → salle d'attente → partie). Pas d'écran de récap séparé (voir
// CLAUDE.md "Fleet Siege", même choix que Connect Duo) : la révélation et
// "Rejouer" s'affichent directement sous les plateaux, donc pas de coupure
// de caméra à la fin d'une partie — "Rejouer" repart en placement sur la
// MÊME connexion, un MediaStreamTrack arrêté ne redémarrerait jamais.
export function FleetSiegeClient({ code }: FleetSiegeClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("fleetSiegeBattle");

  const session = useFleetSiegeSession({ dataChannel, isInitiator });

  if (session.hasStarted) {
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        {session.phase === "placement" ? <FleetSiegePlacementStage session={session} /> : <FleetSiegeBattleStage session={session} />}
      </div>
    );
  }

  return (
    <FleetSiegeLobby
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
