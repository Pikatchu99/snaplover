import type { FrameId, StripStyle } from "@/types/frame";

// Protocole du data channel "ctrl" — clock-sync, déclenchement synchronisé,
// échange d'image par chunks. Voir SNAPROOM-SPEC.md §9 et snaproom-spike/.

export type RealtimeMessage =
  | { t: "ping"; c: number }
  | { t: "pong"; c: number; s: number }
  // L'invité signale que son listener de messages est attaché (évite une
  // course : l'hôte ne doit envoyer sa config qu'une fois sûr que l'invité
  // peut la recevoir, pas dès l'ouverture de SON propre canal) et transmet
  // son prénom au passage.
  | { t: "hello"; name: string }
  // L'hôte diffuse sa config (poses/cadre/style) et son prénom en réponse à
  // "hello" : l'invité peut arriver via un code saisi (sans les query params
  // de l'hôte), donc c'est l'hôte qui fait autorité — voir SNAPROOM-SPEC.md §7.
  | { t: "config"; poses: number; frameId: FrameId; style: StripStyle; hostName: string }
  | { t: "capture"; pose: number; fireAtHost: number }
  | { t: "img-meta"; pose: number }
  | { t: "img"; part: string }
  | { t: "img-end"; pose: number; hostTime: number }
  | { t: "reset" };
