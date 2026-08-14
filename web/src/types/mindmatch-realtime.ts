// Protocole du data channel "ctrl" pour une room Mind Match — jamais mélangé
// avec RealtimeMessage (photo) ni DuelMessage (Doodle Duel) : une room
// /mindmatch/r/[code] ne monte jamais leurs hooks, donc ce canal ne porte
// jamais que ces messages. Voir hooks/use-mindmatch-session.ts.
export type MindMatchMessage =
  // Envoyé par l'hôte au clic sur "Lancer la partie" — fait passer l'invité·e
  // de la salle d'attente à la manche 0 (même rôle que "duel-round-start"
  // côté Doodle Duel, en plus simple : les rôles étant symétriques ici,
  // aucune manche suivante n'a besoin de ce message, seul le tout premier
  // lancement de partie en a besoin).
  | { t: "mindmatch-start" }
  // Envoyé par chaque côté dès qu'iel soumet son mot pour l'essai courant —
  // jamais avant que les DEUX l'aient soumis pour le même (round, attempt)
  // que la révélation n'a lieu (voir maybeReveal). round/attempt permettent
  // au récepteur d'ignorer un message qui ne correspond plus à son état
  // courant (défensif — ne devrait jamais arriver vu l'ordre garanti d'un
  // data channel WebRTC "ordered", mais rend l'intention explicite).
  | { t: "mindmatch-word"; round: number; attempt: number; word: string }
  // Envoyé par la première personne qui clique "Réessayer"/"Manche
  // suivante"/"Voir le récap" après une révélation — même mécanisme que
  // "duel-next-round" (voir types/duel-realtime.ts) : sans lui, chaque côté
  // avancerait indépendamment et pourrait désynchroniser la partie sur un
  // double-clic. round/attempt identifient la révélation quittée, pas la
  // suivante — l'autre côté ignore un message qui ne correspond plus à sa
  // révélation courante.
  | { t: "mindmatch-advance"; round: number; attempt: number };
