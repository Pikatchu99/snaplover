// SnapLover — service de signaling WebSocket.
// Rôle unique : mettre en relation 2 pairs d'une même room et relayer les
// messages WebRTC (offer / answer / ICE). Aucun média, aucune donnée de
// séance ne transite ici. Porté et durci depuis snaproom-spike/server.js
// (voir SNAPROOM-SPEC.md §8 et §19).

import { createServer } from "node:http";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { ClientMessage, ServerMessage } from "./types.js";

// Le process doit bind un port pour démarrer : fallback conservé, mais on
// avertit toujours plutôt que de laisser passer silencieusement (voir
// CLAUDE.md "Aucune valeur d'infra en dur").
if (!process.env.PORT) console.warn("PORT not set — defaulting to 8080.");
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 5000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const ORPHAN_ROOM_TTL_MS = 10 * 60_000;

// Généré côté web (création de room) avec un charset sans ambigus (O/0, I/1) ;
// ici on ne valide qu'une forme raisonnable pour éviter les clés arbitraires.
const ROOM_CODE_RE = /^[A-Z0-9]{4,8}$/;

interface Peer extends WebSocket {
  isAlive: boolean;
  room: string | null;
}

interface RoomEntry {
  peers: Set<Peer>;
  createdAt: number;
}

const rooms = new Map<string, RoomEntry>();

function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin }, callback) => {
    if (!ALLOWED_ORIGIN) {
      callback(true); // dev uniquement : pas de restriction d'origine
      return;
    }
    callback(origin === ALLOWED_ORIGIN);
  },
});

wss.on("connection", (raw) => {
  const ws = raw as Peer;
  ws.isAlive = true;
  ws.room = null;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (data: RawData) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      const room = String(msg.room ?? "").trim().toUpperCase();
      if (!ROOM_CODE_RE.test(room)) {
        send(ws, { type: "invalid-room" });
        return;
      }

      let entry = rooms.get(room);
      if (!entry) {
        if (rooms.size >= MAX_ROOMS) {
          send(ws, { type: "invalid-room" });
          return;
        }
        entry = { peers: new Set(), createdAt: Date.now() };
        rooms.set(room, entry);
      }

      if (entry.peers.size >= 2) {
        send(ws, { type: "full" });
        return;
      }

      ws.room = room;
      entry.peers.add(ws);

      const isInitiator = entry.peers.size === 1;
      send(ws, { type: "joined", initiator: isInitiator, peers: entry.peers.size });

      for (const peer of entry.peers) {
        if (peer !== ws) send(peer, { type: "peer-ready", peers: entry.peers.size });
      }
      return;
    }

    if (msg.type === "signal" && ws.room) {
      const entry = rooms.get(ws.room);
      if (!entry) return;
      for (const peer of entry.peers) {
        if (peer !== ws) send(peer, { type: "signal", data: msg.data });
      }
    }
  });

  ws.on("close", () => {
    if (!ws.room) return;
    const entry = rooms.get(ws.room);
    if (!entry) return;
    entry.peers.delete(ws);
    for (const peer of entry.peers) send(peer, { type: "peer-left" });
    if (entry.peers.size === 0) rooms.delete(ws.room);
  });
});

// Heartbeat : purge les sockets mortes (coupures réseau sans close propre).
const heartbeat = setInterval(() => {
  for (const raw of wss.clients) {
    const ws = raw as Peer;
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

// Purge des rooms orphelines : un seul pair jamais rejoint au-delà du TTL.
const orphanSweep = setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of rooms) {
    if (entry.peers.size < 2 && now - entry.createdAt > ORPHAN_ROOM_TTL_MS) {
      for (const peer of entry.peers) peer.close(4000, "room expired");
      rooms.delete(code);
    }
  }
}, 60_000);

function shutdown() {
  clearInterval(heartbeat);
  clearInterval(orphanSweep);
  wss.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, () => {
  console.log(`SnapLover signaling listening on :${PORT}`);
  if (!ALLOWED_ORIGIN) {
    console.warn("ALLOWED_ORIGIN not set — accepting connections from any origin (dev only).");
  }
});
