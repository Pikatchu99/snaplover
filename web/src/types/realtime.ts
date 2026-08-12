import type { DoodlePoint } from "@/types/doodle";
import type { FrameId, StripStyle } from "@/types/frame";
import type { ChallengeMode, StickerId, StickerPackId } from "@/types/sticker";

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
  // mode/stickerPackId/stickerIds sont optionnels : absents en mode classic.
  | {
      t: "config";
      poses: number;
      frameId: FrameId;
      style: StripStyle;
      hostName: string;
      mode: ChallengeMode;
      stickerPackId?: StickerPackId;
      stickerIds?: StickerId[];
    }
  // Mode challenge uniquement : annonce le sticker à afficher (phase de
  // lecture/préparation) avant que "capture" ne lance le vrai 3·2·1 — voir
  // docs/STICKER-CHALLENGES.md.
  | { t: "reveal"; pose: number; durationMs: number }
  | { t: "capture"; pose: number; fireAtHost: number }
  | { t: "img-meta"; pose: number }
  | { t: "img"; part: string }
  | { t: "img-end"; pose: number; hostTime: number }
  // Dessin collaboratif en direct (voir hooks/use-doodle.ts) — un seul type de
  // message porte à la fois la création d'un trait (le partenaire ne connaît
  // pas encore strokeId) et son prolongement (points ajoutés au fil du
  // glissé) : le receveur crée le trait à la première occurrence de
  // strokeId, l'étend sinon. "color" est redondant sur les messages suivants
  // du même trait, mais un seul type de message garde le protocole simple.
  | { t: "doodle-points"; strokeId: string; color: string; points: DoodlePoint[] }
  | { t: "doodle-clear" };
