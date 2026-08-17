// Pure maths de synchronisation d'horloge — même formule que
// lib/realtime/clock-sync.ts et lib/realtime/schedule-capture.ts, jamais
// réutilisées telles quelles (câblées en dur sur RealtimeChannel/
// RealtimeMessage, voir CLAUDE.md "Reflex Match") : seul le calcul pur est
// dupliqué ici, le transport (ping/pong) est réimplémenté sous le
// protocole propre à Reflex Match (voir hooks/use-reflex-match-session.ts).

export interface ClockSyncSample {
  offset: number;
  rtt: number;
}

// `c` = horodatage d'envoi du ping (horloge locale de l'invité·e), `s` =
// horodatage de réponse (horloge de l'hôte, la référence), `r` =
// horodatage de réception du pong (horloge locale de l'invité·e).
export function computeSample(c: number, s: number, r: number): ClockSyncSample {
  const rtt = r - c;
  const offset = s + rtt / 2 - r;
  return { offset, rtt };
}

// Convertit un instant cible exprimé en heure de référence (horloge hôte)
// en délai local, à partir de l'offset mesuré (0 pour l'hôte lui-même,
// qui EST la référence).
export function computeRevealDelay(revealAtHost: number, offset: number): number {
  const hostNow = Date.now() + offset;
  return Math.max(0, revealAtHost - hostNow);
}
