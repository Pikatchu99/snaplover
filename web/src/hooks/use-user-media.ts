"use client";

import { useEffect, useRef, useState } from "react";

export type UserMediaStatus = "requesting" | "ready" | "denied";

export function useUserMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<UserMediaStatus>("requesting");
  const [attempt, setAttempt] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      // facingMode "user" (frontale) en préférence souple (`ideal`, pas
      // `exact`) : c'est l'usage prévu (selfie à deux, voir CameraTile qui
      // mirrore déjà l'aperçu local en ce sens), mais `exact` ferait échouer
      // getUserMedia sur les appareils n'ayant qu'une seule caméra (laptop,
      // desktop) qui ne se déclare pas explicitement "user".
      .getUserMedia({ video: { facingMode: { ideal: "user" } }, audio: true })
      .then((mediaStream) => {
        if (cancelled) {
          for (const track of mediaStream.getTracks()) track.stop();
          return;
        }
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });

    return () => {
      cancelled = true;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    };
  }, [attempt]);

  return {
    stream,
    status,
    retry: () => {
      setStatus("requesting");
      setAttempt((n) => n + 1);
    },
  };
}
