# SnapLover

Une seule photo. À deux, même à distance.

Deux personnes rejoignent une room, activent leur caméra, et prennent une bande photo ensemble :
un compte à rebours 3·2·1 synchronisé déclenche la capture sur les deux écrans au même instant.
Aucun compte requis. Gratuit et open source.

Spécification complète : [`docs/SNAPROOM-SPEC.md`](./docs/SNAPROOM-SPEC.md).

## Stack

- Next.js (App Router) + React 19 + TypeScript strict — `web/`
- Service de signaling WebSocket (Node + `ws`) — `signaling/`
- Tailwind CSS v4 + shadcn/ui (Radix) + Lucide + Framer Motion
- WebRTC (P2P vidéo + data channel), STUN Google + TURN via variables d'environnement
- pnpm workspace, aucune base de données au MVP (rooms éphémères en mémoire)

## Prérequis

- Node.js 18+
- pnpm

## Installation

```bash
pnpm install
```

## Développement

```bash
# Terminal 1 — app web (http://localhost:3000)
cd web
cp .env.example .env
pnpm dev

# Terminal 2 — signaling (ws://localhost:8080)
cd signaling
cp .env.example .env
pnpm dev
```

## Structure

```
snaproom/
├─ web/              # Next.js
├─ signaling/         # service WebSocket
├─ snaproom-spike/    # spike de faisabilité (référence, ne pas déployer)
└─ docs/
   ├─ SNAPROOM-SPEC.md   # spécification de référence
   └─ design/            # maquettes (.dc.html)
```

Conventions et détails techniques : [`CLAUDE.md`](./CLAUDE.md).
