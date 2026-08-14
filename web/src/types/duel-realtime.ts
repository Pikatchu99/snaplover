import type { DoodlePoint } from "@/types/doodle";

// Protocole du data channel "ctrl" pour une room Doodle Duel — jamais mélangé
// avec RealtimeMessage (types/realtime.ts) : une room /duel/r/[code] n'a
// jamais de useCaptureSession, donc ce canal ne porte jamais que ces
// messages. Voir hooks/use-duel-session.ts.
export type DuelMessage =
  // Même rôle que "hello" côté photo : l'invité·e prouve que son listener est
  // attaché avant que l'hôte ne lance la manche 1 (évite la même course déjà
  // rencontrée côté capture).
  | { t: "duel-hello" }
  // Envoyé UNIQUEMENT par le·la dessinateur·rice de la manche (jamais le mot
  // lui-même — seul·e le·la dessinateur·rice le connaît) au moment où il·elle
  // clique "Dessiner !". drawerIsInitiator est redondant avec la parité de
  // `round` mais gardé explicite par robustesse (déjà eu des bugs de synchro
  // sur des déductions implicites dans ce protocole).
  | { t: "duel-round-start"; round: number; drawerIsInitiator: boolean; durationMs: number }
  | { t: "duel-points"; strokeId: string; points: DoodlePoint[] }
  | { t: "duel-clear" }
  | { t: "duel-guess"; text: string }
  | { t: "duel-guess-result"; correct: boolean }
  // Envoyé par le·la dessinateur·rice (seul·e autorité sur SA manche, qu'elle
  // se termine par une bonne réponse ou l'écoulement du chrono) — révèle enfin
  // le mot aux deux côtés.
  | { t: "duel-round-end"; word: string; guessed: boolean; timeMs: number }
  // Envoyé par la première personne qui clique "Manche suivante"/"Voir le
  // récap" après la révélation — sans ce message, les deux côtés avançaient
  // chacun de leur côté sans se synchroniser, un simple clic en double sur
  // l'un des deux écrans suffisait à les désynchroniser (manche 2/3 d'un
  // côté, 3/3 de l'autre — bug réel observé en testant). `round` permet à
  // l'autre côté d'ignorer un message en double (ex. les deux ont cliqué à
  // peu près en même temps) plutôt que d'avancer deux fois.
  | { t: "duel-next-round"; round: number };
