// Miroir du protocole de signaling — voir signaling/src/types.ts et SNAPROOM-SPEC.md §8.

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
