// Protocole du data channel "ctrl" pour une room Connect Duo — jamais
// mélangé avec les autres protocoles. Voir hooks/use-connect-duo-session.ts.
export type ConnectDuoMessage =
  // Envoyé une seule fois par l'invité·e dès que son listener réseau est
  // attaché — même rôle que le hello/config de la photo ou "duel-hello" :
  // l'hôte ne doit jamais jouer son premier jeton avant d'avoir reçu ce
  // message, sinon le tout premier coup risque de partir avant que
  // l'invité·e (instance React fraîchement montée après la connexion) ait
  // fini d'attacher son propre listener — course déjà rencontrée et
  // corrigée plusieurs fois dans ce projet.
  | { t: "connectduo-hello" }
  // Envoyé une seule fois par l'hôte au clic sur "Lancer la partie" — fait
  // passer l'invité·e de la salle d'attente à l'écran de jeu. Sans ce
  // message explicite, l'invité·e (dont le "hello" ci-dessus part dès la
  // connexion, avant même que l'hôte ait cliqué quoi que ce soit) verrait
  // l'écran de jeu avant l'hôte — les deux côtés doivent démarrer ensemble,
  // même principe que le lancement des autres jeux du hub.
  | { t: "connectduo-start" }
  // Le SEUL message de jeu, et toute la partie tient dedans : `index` est
  // le numéro de coup (0-indexé) — pair = jeton de l'hôte, impair = jeton
  // de l'invité·e (voir discForIndex). `column` est 0–6. Le plateau, le
  // tour courant et la victoire/l'égalité sont TOUJOURS recalculés à partir
  // du log de coups, jamais transmis comme un verdict séparé.
  | { t: "connectduo-move"; index: number; column: number }
  // Envoyé par qui clique "Rejouer" en premier après la fin de partie — `id`
  // incrémente à chaque nouvelle partie, gardé par une ref locale pour
  // qu'un double-clic (ou les deux côtés qui cliquent presque en même
  // temps) ne réinitialise le plateau qu'une seule fois, jamais deux (même
  // classe de bug déjà rencontrée et corrigée sur Doodle Duel/Mind Match/
  // Word Sonar : "duel-next-round"/"mindmatch-advance"/"wordsonar-advance").
  | { t: "connectduo-rematch"; id: number };
