"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useConnectDuoSession } from "@/hooks/use-connect-duo-session";
import { ConnectDuoLobby } from "@/components/connect-duo/ConnectDuoLobby";
import { ConnectDuoBoard } from "@/components/connect-duo/ConnectDuoBoard";
import { FaceBubbles } from "@/components/room/FaceBubbles";

interface ConnectDuoClientProps {
  code: string;
}

// Orchestrateur d'une room Connect Duo — même squelette que les autres jeux
// (connexion → salle d'attente → partie). Pas d'écran de récap séparé (voir
// CLAUDE.md "Connect Duo") : le résultat s'affiche directement sous le
// plateau, "Rejouer" repart immédiatement sans quitter l'écran — donc pas de
// coupure de caméra à la fin d'une partie contrairement aux autres jeux
// (Doodle Duel/Word Sonar), qui ont un vrai écran de récap séparé : ici, la
// couper casserait irrémédiablement "Rejouer" (un MediaStreamTrack arrêté ne
// redémarre jamais).
export function ConnectDuoClient({ code }: ConnectDuoClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("connectDuoRound");

  const session = useConnectDuoSession({ dataChannel, isInitiator });

  if (session.hasStarted) {
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        <ConnectDuoBoard session={session} isInitiator={isInitiator} />
      </div>
    );
  }

  return (
    <ConnectDuoLobby
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
