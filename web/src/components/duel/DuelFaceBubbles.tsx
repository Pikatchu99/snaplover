"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaceBubbleProps {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  label: string;
  micToggle?: { enabled: boolean; onToggle: () => void };
}

function FaceBubble({ stream, mirrored, muted, label, micToggle }: FaceBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, [stream]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-14 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/15">
        {stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={cn("size-full object-cover", mirrored && "-scale-x-100")}
          />
        )}
        {micToggle && (
          <button
            type="button"
            onClick={micToggle.onToggle}
            aria-pressed={!micToggle.enabled}
            className="absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full bg-[#161319] text-white ring-2 ring-[#161319]"
          >
            {micToggle.enabled ? <Mic className="size-3" /> : <MicOff className="size-3 text-[#fb5a46]" />}
          </button>
        )}
      </div>
      <span className="text-[11px] font-medium text-white/60">{label}</span>
    </div>
  );
}

interface DuelFaceBubblesProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

// Bulles rondes façon Loom, visibles pendant TOUTE la partie (pas seulement
// la salle d'attente) — voir hooks/use-duel-session.ts. Avant ce composant,
// la vidéo ET l'audio disparaissaient dès qu'on commençait à dessiner (plus
// aucun <video>/<audio> monté à l'écran de manche) : retour utilisateur réel
// après test, corrigé en gardant ces bulles montées sur tous les écrans de
// jeu (DuelClient.tsx), pas seulement DuelLobby.
export function DuelFaceBubbles({ localStream, remoteStream }: DuelFaceBubblesProps) {
  const t = useTranslations("duelRound");
  const [micEnabled, setMicEnabled] = useState(true);

  function toggleMic() {
    const next = !micEnabled;
    setMicEnabled(next);
    for (const track of localStream?.getAudioTracks() ?? []) track.enabled = next;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl items-center justify-center gap-6">
      <FaceBubble
        stream={localStream}
        mirrored
        muted
        label={t("you")}
        micToggle={{ enabled: micEnabled, onToggle: toggleMic }}
      />
      <FaceBubble stream={remoteStream} label={t("partner")} />
    </div>
  );
}
