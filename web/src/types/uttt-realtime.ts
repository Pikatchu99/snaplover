// Protocole du data channel "ctrl" pour une room Ultimate Tic-Tac-Toe —
// jamais mélangé avec les autres protocoles. Voir hooks/use-uttt-session.ts.
export type UtttMessage =
  // Envoyé par CHAQUE côté dès que son listener réseau est attaché (voir
  // hooks/use-uttt-session.ts) — preuve symétrique que le partenaire écoute
  // vraiment, même principe que le hello/config de la photo ou
  // connectduo-hello, mais ici les DEUX côtés doivent le prouver (aucun des
  // deux ne joue en premier tant que les deux ne sont pas confirmés prêts).
  // Renvoyé en boucle courte tant que le "ready" du partenaire n'est pas
  // reçu (voir le hook) — un one-shot symétrique instantané aurait la même
  // course que le hello/config historique si les deux listeners ne
  // s'attachent pas exactement au même instant.
  | { t: "uttt-ready" }
  // Le seul message de jeu. `moveIndex` est la position de ce coup dans le
  // log de coups de l'expéditeur au moment de l'envoi — gardé par
  // convention d'idempotence/ordre du projet (comme les autres jeux),
  // jamais parce que le data channel (ordonné, fiable) est censé
  // réordonner ou dupliquer en pratique. L'expéditeur applique son propre
  // coup en optimiste (pas d'attente de round-trip, nécessaire pour un
  // ressenti réactif) ; le·la destinataire revalide `moveIndex` ET relance
  // isLegalMove() avant d'appliquer — un échec sur l'un ou l'autre est
  // silencieusement ignoré (à traiter comme un bug si ça arrive un jour,
  // jamais "réparé" ou resynchronisé à la volée : il n'y a aucune vérité
  // serveur vers laquelle se resynchroniser).
  | { t: "uttt-move"; boardIndex: number; cellIndex: number; moveIndex: number }
  // Envoyé par qui clique "Rejouer" en premier — `id` incrémente à chaque
  // partie, gardé par une ref locale (même garde d'idempotence que
  // connectduo-rematch/edgeletters-advance/siege-rematch) pour qu'un clic
  // tardif après une partie déjà relancée ne réinitialise pas un plateau en
  // cours. L'hôte reste X, l'invité·e reste O — jamais renégocié.
  | { t: "uttt-rematch"; id: number };
