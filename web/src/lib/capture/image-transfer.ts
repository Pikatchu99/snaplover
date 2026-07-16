import type { RealtimeChannel } from "@/lib/realtime/channel";
import type { RealtimeMessage } from "@/types/realtime";

const CHUNK_SIZE = 12_000;

// Envoie une moitié capturée par chunks (~12 Ko) — voir SNAPROOM-SPEC.md §9.
export function sendImage(channel: RealtimeChannel, pose: number, dataUrl: string, hostTime: number) {
  channel.send({ t: "img-meta", pose });
  for (let i = 0; i < dataUrl.length; i += CHUNK_SIZE) {
    channel.send({ t: "img", part: dataUrl.slice(i, i + CHUNK_SIZE) });
  }
  channel.send({ t: "img-end", pose, hostTime });
}

export interface ReceivedImage {
  pose: number;
  dataUrl: string;
  hostTime: number;
}

// Réassemble les chunks reçus en une image complète, pose par pose.
export function createImageReceiver(onComplete: (image: ReceivedImage) => void) {
  let buffer = "";
  let pose = 0;

  return (message: RealtimeMessage) => {
    if (message.t === "img-meta") {
      buffer = "";
      pose = message.pose;
    } else if (message.t === "img") {
      buffer += message.part;
    } else if (message.t === "img-end") {
      onComplete({ pose, dataUrl: buffer, hostTime: message.hostTime });
      buffer = "";
    }
  };
}
