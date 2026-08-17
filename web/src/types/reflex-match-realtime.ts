import type { ReflexWinner } from "@/types/reflex-match";

// Protocole du data channel "ctrl" pour une room Reflex Match — jamais
// mélangé avec les autres protocoles NI avec le ping/pong de clock-sync de
// la bande photo de base (lib/realtime/clock-sync.ts, câblé en dur sur
// RealtimeChannel/RealtimeMessage) : seule la formule de calcul pure est
// réutilisée (voir lib/reflex-match/clock-sync.ts), jamais le transport.
export type ReflexMatchMessage =
  // Ping/pong — seul·e l'invité·e mesure (l'hôte reste la référence,
  // offset = 0, jamais transmis), même convention que le flux photo de
  // base : nécessaire ici car l'autorité de manche ALTERNE (hôte les
  // manches paires, invité·e les impaires), mais la référence d'horloge,
  // elle, ne change jamais — qui a l'autorité cette manche convertit
  // simplement SON PROPRE horodatage local en heure de référence via son
  // propre offset (0 pour l'hôte, mesuré une fois pour l'invité·e).
  | { t: "reflex-ping"; c: number }
  | { t: "reflex-pong"; c: number; s: number }
  // Envoyé UNE FOIS par l'autorité de la manche, immédiatement. `revealAt`
  // est un horodatage de référence (heure hôte) — chaque destinataire le
  // convertit via son propre offset avant de programmer sa propre
  // révélation locale ; l'autorité fait EXACTEMENT la même chose pour
  // elle-même (jamais de rendu anticipé juste parce qu'elle a généré la
  // graine en premier — voir CLAUDE.md "Reflex Match").
  | { t: "reflex-round-start"; round: number; seed: number; revealAt: number }
  // Envoyé par CHAQUE côté (les deux exécutent la même logique, pas
  // seulement le·la non-autorité) — une seule fois par manche, uniquement
  // sur le premier tap qui atterrit sur la bonne case impaire à ou après
  // sa propre révélation locale. Faux départs et cases ratées ne sont
  // JAMAIS transmis.
  | { t: "reflex-tap"; round: number; cellIndex: number; tapAt: number }
  // Envoyé UNE SEULE FOIS par l'autorité de la manche, après avoir
  // rassemblé les deux tentatives (ou atteint le délai maximal) — jamais
  // calculé indépendamment par l'autre côté, qui attend toujours ce
  // message. `oddIndex` est redondant (les deux côtés l'ont déjà calculé
  // via generateRound) mais inclus pour confirmer/mettre en évidence la
  // bonne case sans recalcul, et pour détecter une éventuelle divergence.
  | { t: "reflex-round-result"; round: number; winner: ReflexWinner; hostTapAt: number | null; guestTapAt: number | null; oddIndex: number }
  // Envoyé par qui clique "Manche suivante" en premier — `round` est la
  // cible vers laquelle on avance (jamais la manche qu'on quitte), gardée
  // par sa propre monotonie (voir applyAdvance dans le hook). `matchOver`
  // distingue "manche suivante" de "partie terminée, direction récap" —
  // nécessaire car la mort subite (voir CLAUDE.md) rend le nombre total de
  // manches non-fixe, contrairement à `round >= config.X.rounds` utilisé
  // par les autres jeux à manches.
  | { t: "reflex-advance"; round: number; matchOver: boolean };
