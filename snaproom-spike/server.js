// SnapRoom — spike de faisabilité : serveur de signaling minimal.
// Rôle unique : mettre en relation 2 navigateurs d'une même room et relayer
// les messages WebRTC (offer / answer / ICE). Aucune donnée n'est stockée.
//
// Lancement :  node server.js   (port 8080 par défaut, override via PORT)

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

// --- Serveur HTTP statique (sert /public) ---
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

// --- Signaling WebSocket ---
const wss = new WebSocketServer({ server });

// rooms: Map<roomCode, Set<ws>>  (2 pairs max)
const rooms = new Map();

function peersOf(room) {
  return rooms.get(room) || new Set();
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

wss.on("connection", (ws) => {
  ws.room = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      const room = String(msg.room || "").trim();
      if (!room) return;

      const set = peersOf(room);
      if (set.size >= 2) {
        send(ws, { type: "full" });
        return;
      }

      ws.room = room;
      set.add(ws);
      rooms.set(room, set);

      // Le premier arrivé est l'initiateur (il créera l'offer).
      const isInitiator = set.size === 1;
      send(ws, { type: "joined", initiator: isInitiator, peers: set.size });

      // Préviens l'autre pair qu'un second est là -> il peut démarrer.
      for (const peer of set) {
        if (peer !== ws) send(peer, { type: "peer-ready", peers: set.size });
      }
      return;
    }

    // Relais transparent des messages de signaling vers l'autre pair.
    if (msg.type === "signal" && ws.room) {
      for (const peer of peersOf(ws.room)) {
        if (peer !== ws) send(peer, { type: "signal", data: msg.data });
      }
    }
  });

  ws.on("close", () => {
    if (!ws.room) return;
    const set = peersOf(ws.room);
    set.delete(ws);
    for (const peer of set) send(peer, { type: "peer-left" });
    if (set.size === 0) rooms.delete(ws.room);
  });
});

server.listen(PORT, () => {
  console.log(`SnapRoom spike : http://localhost:${PORT}`);
  console.log("Expose-le en HTTPS avec un tunnel (voir README), puis ouvre l'URL sur les 2 appareils.");
});
