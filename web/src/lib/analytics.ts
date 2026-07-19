import type { ChallengeMode, ChallengeType, StickerPackId } from "@/types/sticker";

// Umami est entièrement optionnel (voir app/layout.tsx) — `window.umami` est
// absent tant que les variables NEXT_PUBLIC_UMAMI_* ne sont pas configurées.
export function trackLike(kind: "experience" | "app") {
  window.umami?.track(`like-${kind}`);
}

// Dimensions communes à tous les évènements génériques ci-dessous — voir
// `challengeType`/`mode` dans create/page.tsx. Génériques (pas préfixés
// "challenge-") car couvrent classique ET challenge, duo ET solo : demande
// "j'ai besoin de data" comparable entre tous les chemins, pas seulement
// challenge (qui restait le seul suivi jusqu'ici — voir trackChallenge*
// ci-dessous, conservés tels quels pour la continuité de l'historique
// Umami, jamais renommés).
interface SessionDimensions {
  participants: ChallengeType;
  mode: ChallengeMode;
}

// Room/séance créée — duo (room partagée) ET solo (pas de room, mais même
// notion de "création"). Complète trackChallengeRoomCreated (challenge-duo
// uniquement) pour couvrir aussi le classique et le solo.
export function trackRoomCreated({ participants, mode }: SessionDimensions) {
  window.umami?.track("room-created", { participants, mode });
}

// Un invité rejoint une room existante (duo uniquement — le solo n'a pas
// d'étape "rejoindre"). Permet de mesurer le drop-off "créée mais jamais
// rejointe", invisible jusqu'ici (seule la création était suivie).
export function trackRoomJoined() {
  window.umami?.track("room-joined");
}

// Séance démarrée (première pose) — générique, complète trackChallenge*Started
// pour couvrir aussi le classique (duo et solo).
export function trackSessionStarted({ participants, mode }: SessionDimensions) {
  window.umami?.track("session-started", { participants, mode });
}

// Séance terminée (bande composée) — générique, complète trackChallengeCompleted
// pour couvrir aussi le classique (duo et solo).
export function trackSessionCompleted({ participants, mode }: SessionDimensions) {
  window.umami?.track("session-completed", { participants, mode });
}

// Bande téléchargée — générique, complète trackChallengeDownloaded pour
// couvrir aussi le classique (duo et solo), jusqu'ici invisible.
export function trackStripDownloaded({ participants, mode }: SessionDimensions) {
  window.umami?.track("strip-downloaded", { participants, mode });
}

// Bande partagée (Web Share API ou fallback téléchargement) — générique,
// complète trackChallengeShared pour couvrir aussi le classique (duo et solo).
export function trackStripShared({ participants, mode }: SessionDimensions) {
  window.umami?.track("strip-shared", { participants, mode });
}

// Proportion réelle de sessions qui passent par le relais TURN vs en direct
// — voir lib/webrtc/peer-connection.ts::resolveConnectionType. Visible dans
// le dashboard Umami (évènements "connection-direct"/"connection-relay").
export function trackConnectionType(type: "direct" | "relay") {
  window.umami?.track(`connection-${type}`);
}

// Mode Challenge stickers (docs/STICKER-CHALLENGES.md) — pas d'équivalent
// upload utilisateur pour l'instant (pas encore implémenté).
export function trackChallengeRoomCreated() {
  window.umami?.track("challenge-room-created");
}

export function trackChallengeDuoStarted() {
  window.umami?.track("challenge-duo-started");
}

export function trackChallengeSoloStarted() {
  window.umami?.track("challenge-solo-started");
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
