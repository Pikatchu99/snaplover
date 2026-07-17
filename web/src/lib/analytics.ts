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
