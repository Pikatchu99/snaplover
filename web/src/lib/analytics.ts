// Umami est entièrement optionnel (voir app/layout.tsx) — `window.umami` est
// absent tant que les variables NEXT_PUBLIC_UMAMI_* ne sont pas configurées.
export function trackLike(kind: "experience" | "app") {
  window.umami?.track(`like-${kind}`);
}
