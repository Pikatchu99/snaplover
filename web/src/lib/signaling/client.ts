import type { ClientMessage, ServerMessage } from "@/types/signaling";

type MessageHandler = (message: ServerMessage) => void;

// Client WebSocket du protocole de signaling. Ne transporte que la poignée de
// main WebRTC (offer/answer/ICE) — voir SNAPROOM-SPEC.md §8.
export class SignalingClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private closeHandlers = new Set<(code: number) => void>();
  private closedByClient = false;

  connect(url: string, room: string) {
    const ws = new WebSocket(url);
    this.ws = ws;
    this.closedByClient = false;

    ws.onopen = () => this.send({ type: "join", room });

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      for (const handler of this.handlers) handler(message);
    };

    // Ferme le socket "au propre" (nous-mêmes, via close()) vs. une coupure
    // serveur (ex. room orpheline expirée, code 4000 — voir signaling/src/server.ts).
    ws.onclose = (event) => {
      if (this.closedByClient) return;
      for (const handler of this.closeHandlers) handler(event.code);
    };
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onClose(handler: (code: number) => void) {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  close() {
    this.closedByClient = true;
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
    this.closeHandlers.clear();
  }
}
