"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRoomConnection } from "@/hooks/use-room-connection";
import { useUtttSession } from "@/hooks/use-uttt-session";
import { UtttLobby } from "@/components/uttt/UtttLobby";
import { UtttBoard } from "@/components/uttt/UtttBoard";
import { FaceBubbles } from "@/components/room/FaceBubbles";

interface UtttClientProps {
  code: string;
}

// Orchestrateur d'une room Ultimate Tic-Tac-Toe — la salle d'attente la plus
// simple du hub (voir CLAUDE.md) : pas de bouton "Lancer la partie", la
// partie démarre automatiquement dès que les deux "uttt-ready" se sont
// croisés (voir hooks/use-uttt-session.ts) — mais seulement une fois que
// CE client a fini son propre tutoriel de règles (voir UtttTutorial.tsx,
// `tutorialDismissed` passé au hook comme `readyToStart`) : retour
// utilisateur explicite après un premier test ("je comprends pas les
// règles"), un mécanisme aussi peu intuitif que le routage forcé ne peut
// pas se limiter à un texte dans la salle d'attente. Pas d'écran de récap
// séparé non plus : "Rejouer" repart directement sur le même plateau vide,
// la caméra ne s'arrête donc jamais.
export function UtttClient({ code }: UtttClientProps) {
  const { localStream, remoteStream, status, dataChannel, isInitiator, retryCamera } = useRoomConnection(code);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = useTranslations("utttRound");
  const [tutorialDismissed, setTutorialDismissed] = useState(false);

  const session = useUtttSession({ dataChannel, isInitiator, readyToStart: tutorialDismissed });

  if (session.phase === "playing") {
    return (
      <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
        <FaceBubbles localStream={localStream} remoteStream={remoteStream} youLabel={t("you")} partnerLabel={t("partner")} />
        <UtttBoard session={session} />
      </div>
    );
  }

  return (
    <UtttLobby
      roomCode={code}
      localStream={localStream}
      remoteStream={remoteStream}
      status={status}
      localVideoRef={localVideoRef}
      onRetryCamera={retryCamera}
      tutorialDismissed={tutorialDismissed}
      onTutorialDismissedChange={setTutorialDismissed}
    />
  );
}
