"use client";

import { useEffect, useRef, useState } from "react";
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

interface FaceBubblesProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  youLabel: string;
  partnerLabel: string;
}

// Bulles rondes façon Loom, visibles pendant TOUTE la partie (pas seulement
// la salle d'attente) — né dans Doodle Duel (voir hooks/use-duel-session.ts) :
// avant ce composant, la vidéo ET l'audio disparaissaient dès qu'on
// commençait à jouer (plus aucun <video>/<audio> monté à l'écran de manche) —
// retour utilisateur réel après test. Généralisé (labels en props, pas de
// useTranslations interne) au second jeu qui en a eu besoin (Word Sonar) —
// chaque jeu garde ses propres clés i18n ("duelRound"/"wordSonarRound").
export function FaceBubbles({ localStream, remoteStream, youLabel, partnerLabel }: FaceBubblesProps) {
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
        label={youLabel}
        micToggle={{ enabled: micEnabled, onToggle: toggleMic }}
      />
      <FaceBubble stream={remoteStream} label={partnerLabel} />
    </div>
  );
}
