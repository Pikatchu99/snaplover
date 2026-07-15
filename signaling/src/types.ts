// Messages du protocole de signaling — voir SNAPROOM-SPEC.md §8.
// Le signaling ne transporte QUE la poignée de main WebRTC (offer/answer/ICE),
// jamais de média ni de données de séance.

export type ClientMessage =
  | { type: "join"; room: string }
  | { type: "signal"; data: unknown };

export type ServerMessage =
  | { type: "joined"; initiator: boolean; peers: number }
  | { type: "full" }
  | { type: "peer-ready"; peers: number }
  | { type: "peer-left" }
  | { type: "signal"; data: unknown }
  | { type: "invalid-room" };
