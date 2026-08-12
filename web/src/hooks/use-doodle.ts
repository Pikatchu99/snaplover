"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { DOODLE_COLORS, pointFromPointerEvent } from "@/lib/capture/doodle";
import type { DoodlePoint, DoodleStroke } from "@/types/doodle";
import type { RealtimeMessage } from "@/types/realtime";

interface UseDoodleOptions {
  dataChannel: RTCDataChannel | null;
}

// Dessin collaboratif en direct par-dessus le protocole "ctrl" existant (voir
// types/realtime.ts) : chaque partenaire dessine sur sa PROPRE caméra
// (myStrokes, interactif) et voit en direct ce que l'autre dessine sur la
// sienne (peerStrokes, lecture seule) — voir CaptureStage.tsx.
//
// Écoute en addEventListener plutôt que via RealtimeChannel : le data
// channel n'a qu'un seul canal "ctrl", et useCaptureSession possède déjà
// l'unique RealtimeChannel qui s'assigne sur dc.onmessage — un second
// wrapper la remplacerait. addEventListener coexiste sans conflit avec une
// assignation dc.onmessage (deux mécanismes DOM indépendants sur le même
// événement), donc ce hook peut écouter et envoyer sur le même data channel
// sans toucher à use-capture-session.ts.
export function useDoodle({ dataChannel }: UseDoodleOptions) {
  const [myStrokes, setMyStrokes] = useState<DoodleStroke[]>([]);
  const [peerStrokes, setPeerStrokes] = useState<DoodleStroke[]>([]);
  const [color, setColor] = useState<string>(DOODLE_COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);

  const myCanvasRef = useRef<HTMLCanvasElement>(null);
  const peerCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeIdRef = useRef<string | null>(null);
  const pendingPointsRef = useRef<DoodlePoint[]>([]);
  const rafRef = useRef<number | null>(null);

  function send(message: RealtimeMessage) {
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify(message));
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as RealtimeMessage;
      if (message.t === "doodle-points") {
        setPeerStrokes((prev) => {
          const existing = prev.find((stroke) => stroke.id === message.strokeId);
          if (existing) {
            return prev.map((stroke) =>
              stroke.id === message.strokeId ? { ...stroke, points: [...stroke.points, ...message.points] } : stroke,
            );
          }
          return [...prev, { id: message.strokeId, color: message.color, points: [...message.points] }];
        });
      } else if (message.t === "doodle-clear") {
        setPeerStrokes([]);
      }
    }

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
  }, [dataChannel]);

  function flush(strokeId: string) {
    if (pendingPointsRef.current.length === 0) return;
    send({ t: "doodle-points", strokeId, color, points: pendingPointsRef.current });
    pendingPointsRef.current = [];
  }

  // Regroupe les points par frame plutôt que d'envoyer un message par
  // pointermove (jusqu'à 60+/s) — le trait local reste fluide (mis à jour en
  // state à chaque event), seul l'envoi réseau est cadencé.
  function scheduleFlush(strokeId: string) {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      flush(strokeId);
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = myCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);

    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const point = pointFromPointerEvent(canvas, event.clientX, event.clientY);
    activeStrokeIdRef.current = id;
    setMyStrokes((prev) => [...prev, { id, color, points: [point] }]);
    send({ t: "doodle-points", strokeId: id, color, points: [point] });
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const id = activeStrokeIdRef.current;
    const canvas = myCanvasRef.current;
    if (!id || !canvas) return;

    const point = pointFromPointerEvent(canvas, event.clientX, event.clientY);
    setMyStrokes((prev) => prev.map((stroke) => (stroke.id === id ? { ...stroke, points: [...stroke.points, point] } : stroke)));
    pendingPointsRef.current.push(point);
    scheduleFlush(id);
  }

  function handlePointerUp() {
    const id = activeStrokeIdRef.current;
    if (!id) return;
    activeStrokeIdRef.current = null;
    flush(id);
  }

  function clear() {
    setMyStrokes([]);
    send({ t: "doodle-clear" });
  }

  // Appelé à chaque changement de pose (voir RoomClient.tsx) : chaque bande
  // repart d'un canvas vierge, pas d'un dessin qui traînerait de la pose
  // précédente. Purement local — pas de message réseau, chaque côté se
  // réinitialise indépendamment au même point logique de la séance.
  function resetForNewPose() {
    activeStrokeIdRef.current = null;
    pendingPointsRef.current = [];
    setMyStrokes([]);
    setPeerStrokes([]);
  }

  return {
    myCanvasRef,
    peerCanvasRef,
    myStrokes,
    peerStrokes,
    color,
    setColor,
    isDrawing,
    setIsDrawing,
    clear,
    resetForNewPose,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

export type UseDoodleReturn = ReturnType<typeof useDoodle>;
