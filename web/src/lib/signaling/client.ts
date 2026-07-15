import type { ClientMessage, ServerMessage } from "@/types/signaling";

type MessageHandler = (message: ServerMessage) => void;

// Client WebSocket du protocole de signaling. Ne transporte que la poignée de
// main WebRTC (offer/answer/ICE) — voir SNAPROOM-SPEC.md §8.
export class SignalingClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();

  connect(url: string, room: string) {
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => this.send({ type: "join", room });

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      for (const handler of this.handlers) handler(message);
    };
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  close() {
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
  }
}
