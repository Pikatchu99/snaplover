"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { DOODLE_COLORS, pointFromPointerEvent } from "@/lib/capture/doodle";
import type { DoodlePoint, DoodleStroke } from "@/types/doodle";
import type { RealtimeMessage } from "@/types/realtime";

interface UseDoodleOptions {
  dataChannel: RTCDataChannel | null | undefined;
}

// Dessin collaboratif en direct sur la bande déjà composée (voir
// PhotoStrip.tsx) : un seul calque partagé — les deux partenaires dessinent
// dessus et voient les traits de l'autre apparaître en direct. myStrokes/
// peerStrokes restent deux états séparés en interne (savoir quel trait est
// activement en train d'être dessiné localement), mais `strokes` les
// fusionne pour le rendu : le consommateur (PhotoStrip) ne voit qu'un seul
// calque, pas la distinction "qui a dessiné quoi".
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeIdRef = useRef<string | null>(null);
  const pendingPointsRef = useRef<DoodlePoint[]>([]);
  const rafRef = useRef<number | null>(null);

  // Jamais d'échec silencieux (voir CLAUDE.md) : un message perdu ici laisse
  // les deux calques durablement désynchronisés — typiquement "Effacer" qui
  // vide le calque local sans jamais atteindre le partenaire, sans que rien
  // ne le signale.
  function send(message: RealtimeMessage) {
    if (dataChannel?.readyState !== "open") {
      console.warn(`[doodle] message "${message.t}" non envoyé — data channel ${dataChannel?.readyState ?? "absent"}`);
      return;
    }
    dataChannel.send(JSON.stringify(message));
  }

  useEffect(() => {
    if (!dataChannel) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data as string) as RealtimeMessage;
      // TEMPORAIRE — diagnostic CI doodle.spec.ts, à retirer.
      if (typeof message.t === "string" && message.t.startsWith("doodle")) console.debug(`[doodle] recv ${message.t}`);
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
        // "Effacer" vide tout le calque partagé, pas seulement les traits de
        // celui qui a cliqué — sinon les deux pairs finiraient avec des
        // calques désynchronisés (voir clear() ci-dessous).
        setMyStrokes([]);
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
    const canvas = canvasRef.current;
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
    const canvas = canvasRef.current;
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
    setPeerStrokes([]);
    send({ t: "doodle-clear" });
  }

  return {
    canvasRef,
    strokes: [...myStrokes, ...peerStrokes],
    color,
    setColor,
    isDrawing,
    setIsDrawing,
    clear,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

export type UseDoodleReturn = ReturnType<typeof useDoodle>;
