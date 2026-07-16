import type { RealtimeMessage } from "@/types/realtime";

type MessageHandler = (message: RealtimeMessage) => void;

// Wrapper typé autour du data channel "ctrl" — clock-sync, déclenchement,
// échange d'image. Voir SNAPROOM-SPEC.md §9.
export class RealtimeChannel {
  private handlers = new Set<MessageHandler>();

  constructor(private dc: RTCDataChannel) {
    dc.onmessage = (event) => {
      const message = JSON.parse(event.data) as RealtimeMessage;
      for (const handler of this.handlers) handler(message);
    };
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onOpen(handler: () => void) {
    if (this.dc.readyState === "open") {
      handler();
      return;
    }
    this.dc.addEventListener("open", handler, { once: true });
  }

  send(message: RealtimeMessage) {
    if (this.dc.readyState === "open") this.dc.send(JSON.stringify(message));
  }
}
