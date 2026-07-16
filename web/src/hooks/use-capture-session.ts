"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { RealtimeChannel } from "@/lib/realtime/channel";
import { respondToPing, startClockSync } from "@/lib/realtime/clock-sync";
import { CAPTURE_LEAD_MS, computeCaptureDelay } from "@/lib/realtime/schedule-capture";
import { captureFrame } from "@/lib/capture/capture-frame";
import { waitForVideoReady } from "@/lib/capture/wait-for-video-ready";
import { createImageReceiver, sendImage } from "@/lib/capture/image-transfer";
import { composeStrip, type StripCell } from "@/lib/capture/compose-strip";

export type CaptureSessionStatus = "idle" | "countdown" | "capturing" | "done";

const AUTO_ADVANCE_DELAY_MS = 1200;

interface UseCaptureSessionOptions {
  dataChannel: RTCDataChannel | null;
  isInitiator: boolean;
  poses: number;
  localVideoRef: RefObject<HTMLVideoElement | null>;
}

// Orchestration d'une séance : clock-sync, déclenchement synchronisé
// multi-poses, capture locale, échange et composition de la bande.
// Voir SNAPROOM-SPEC.md §9-§10.
export function useCaptureSession({ dataChannel, isInitiator, poses, localVideoRef }: UseCaptureSessionOptions) {
  const [status, setStatus] = useState<CaptureSessionStatus>("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [currentPose, setCurrentPose] = useState(0);
  const [countdownMs, setCountdownMs] = useState(0);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [captureDeltasMs, setCaptureDeltasMs] = useState<number[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const offsetRef = useRef(0);
  const cellsRef = useRef<StripCell[]>([]);
  const myHalfRef = useRef<string | null>(null);
  const myCaptureHostTimeRef = useRef<number | null>(null);
  const peerHalfRef = useRef<string | null>(null);
  const peerCaptureHostTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dataChannel) return;

    const channel = new RealtimeChannel(dataChannel);
    channelRef.current = channel;

    const receiveImage = createImageReceiver(({ pose, dataUrl, hostTime }) => {
      peerHalfRef.current = dataUrl;
      peerCaptureHostTimeRef.current = hostTime;
      tryComposeCell(pose);
    });

    const unsubscribeMessages = channel.onMessage((message) => {
      if (message.t === "ping") respondToPing(channel, message.c);
      else if (message.t === "capture") scheduleCapture(message.pose, message.fireAtHost);
      else receiveImage(message);
    });

    let stopClockSync: (() => void) | undefined;
    channel.onOpen(() => {
      if (!isInitiator) {
        stopClockSync = startClockSync(channel, (sample) => {
          offsetRef.current = sample.offset;
        });
      }
    });

    return () => {
      unsubscribeMessages();
      stopClockSync?.();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChannel, isInitiator]);

  function scheduleCapture(pose: number, fireAtHost: number) {
    setHasStarted(true);
    setStatus("countdown");
    const delay = computeCaptureDelay(fireAtHost, offsetRef.current);
    setCountdownMs(delay);

    const start = Date.now();
    function tick() {
      const remain = delay - (Date.now() - start);
      setCountdownMs(Math.max(0, remain));
      if (remain > 0) requestAnimationFrame(tick);
    }
    tick();

    setTimeout(() => doCapture(pose, fireAtHost), delay);
  }

  async function doCapture(pose: number, fireAtHost: number) {
    setStatus("capturing");
    const video = localVideoRef.current;
    if (!video) return;

    await waitForVideoReady(video);

    let dataUrl: string;
    try {
      dataUrl = captureFrame(video, { mirrored: isInitiator });
    } catch (error) {
      console.error(`[capture] pose ${pose} échec de capture:`, error);
      return;
    }

    const hostTime = Date.now() + offsetRef.current;
    myHalfRef.current = dataUrl;
    myCaptureHostTimeRef.current = hostTime;

    console.debug(
      `[capture] pose ${pose} captured at hostTime=${Math.round(hostTime)} target=${fireAtHost} drift=${Math.round(hostTime - fireAtHost)}ms`,
    );

    if (channelRef.current) sendImage(channelRef.current, pose, dataUrl, hostTime);
    tryComposeCell(pose);
  }

  function tryComposeCell(pose: number) {
    if (!myHalfRef.current || !peerHalfRef.current) return;

    if (myCaptureHostTimeRef.current != null && peerCaptureHostTimeRef.current != null) {
      const delta = Math.abs(myCaptureHostTimeRef.current - peerCaptureHostTimeRef.current);
      console.debug(`[capture] pose ${pose} écart de synchro: ${Math.round(delta)}ms`);
      setCaptureDeltasMs((prev) => [...prev, delta]);
    }

    cellsRef.current[pose] = {
      left: isInitiator ? myHalfRef.current : peerHalfRef.current,
      right: isInitiator ? peerHalfRef.current : myHalfRef.current,
    };

    myHalfRef.current = null;
    myCaptureHostTimeRef.current = null;
    peerHalfRef.current = null;
    peerCaptureHostTimeRef.current = null;

    const nextPose = pose + 1;
    setCurrentPose(nextPose);

    if (nextPose >= poses) {
      setStatus("done");
      composeStrip(cellsRef.current)
        .then(setStripUrl)
        .catch((error) => console.error("[capture] échec de composition de la bande:", error));
      return;
    }

    setStatus("idle");
    if (isInitiator) setTimeout(() => triggerCapture(nextPose), AUTO_ADVANCE_DELAY_MS);
  }

  function triggerCapture(pose: number) {
    if (!isInitiator || !channelRef.current) return;
    const fireAtHost = Date.now() + CAPTURE_LEAD_MS;
    channelRef.current.send({ t: "capture", pose, fireAtHost });
    scheduleCapture(pose, fireAtHost);
  }

  return {
    status,
    hasStarted,
    currentPose,
    poses,
    countdownMs,
    stripUrl,
    captureDeltasMs,
    startSession: () => triggerCapture(0),
  };
}
