// Protocole du data channel "ctrl" — clock-sync, déclenchement synchronisé,
// échange d'image par chunks. Voir SNAPROOM-SPEC.md §9 et snaproom-spike/.

export type RealtimeMessage =
  | { t: "ping"; c: number }
  | { t: "pong"; c: number; s: number }
  | { t: "capture"; pose: number; fireAtHost: number }
  | { t: "img-meta"; pose: number }
  | { t: "img"; part: string }
  | { t: "img-end"; pose: number; hostTime: number };
