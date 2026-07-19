import type { StickerPackId } from "@/types/sticker";

// Umami est entièrement optionnel (voir app/layout.tsx) — `window.umami` est
// absent tant que les variables NEXT_PUBLIC_UMAMI_* ne sont pas configurées.
export function trackLike(kind: "experience" | "app") {
  window.umami?.track(`like-${kind}`);
}

// Proportion réelle de sessions qui passent par le relais TURN vs en direct
// — voir lib/webrtc/peer-connection.ts::resolveConnectionType. Visible dans
// le dashboard Umami (évènements "connection-direct"/"connection-relay").
export function trackConnectionType(type: "direct" | "relay") {
  window.umami?.track(`connection-${type}`);
}

// Mode Challenge stickers (docs/STICKER-CHALLENGES.md) — duo uniquement
// pour l'instant, pas d'équivalent solo/upload (pas encore implémentés).
export function trackChallengeRoomCreated() {
  window.umami?.track("challenge-room-created");
}

export function trackChallengeDuoStarted() {
  window.umami?.track("challenge-duo-started");
}

export function trackChallengeStarted() {
  window.umami?.track("challenge-started");
}

export function trackChallengeCompleted() {
  window.umami?.track("challenge-completed");
}

export function trackChallengeDownloaded() {
  window.umami?.track("challenge-downloaded");
}

export function trackChallengeShared() {
  window.umami?.track("challenge-shared");
}

export function trackChallengePackSelected(packId: StickerPackId) {
  window.umami?.track(`challenge-pack-selected-${packId}`);
}
