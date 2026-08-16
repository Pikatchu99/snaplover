// Protocole du data channel "ctrl" pour une room Edge Letters — jamais
// mélangé avec les autres protocoles. Voir hooks/use-edge-letters-session.ts.
export type EdgeLettersMessage =
  // Envoyé une seule fois par l'hôte au clic sur "Lancer la partie" — ne
  // porte aucune config (rien à choisir, contrairement à la longueur de mot
  // de Word Sonar) : remet juste les deux côtés à la manche 0 / phase
  // "picking".
  | { t: "edgeletters-start" }
  // Envoyé par chacun·e dès qu'iel verrouille sa lettre (ou dès que son
  // propre chrono local de choix expire, voir config.edgeLetters.pickDurationMs).
  // `role` est transmis explicitement plutôt que redéduit de la parité de
  // manche à la réception — retire toute une classe de bug "les deux côtés
  // ne sont plus d'accord sur qui a quel rôle", au prix de quelques octets.
  | { t: "edgeletters-letter-pick"; round: number; role: "start" | "end"; letter: string }
  // Tentative envoyée UNIQUEMENT après validation locale réussie (liste de
  // mots + lettres de début/fin + longueur minimale) — une tentative
  // invalide ne touche jamais le réseau, elle ne coûte rien à personne.
  | { t: "edgeletters-claim"; round: number; word: string }
  // Émis UNIQUEMENT par l'arbitre de la manche (voir
  // adjudicatorIsInitiator dans le hook — même parité que le choix de rôle,
  // une seule source de vérité) après avoir revalidé indépendamment la
  // tentative retenue — jamais transmis par l'autre côté, qui attend
  // toujours ce message plutôt que de se déclarer gagnant·e de son propre
  // chef. `winner: null` = match nul (chrono de course écoulé sans
  // tentative valide).
  | { t: "edgeletters-round-result"; round: number; winner: "host" | "guest" | null; word: string | null }
  // Première personne qui clique "Manche suivante"/"Voir le récap" après
  // une révélation — même garde d'idempotence que les 3 jeux précédents
  // (`duel-next-round`/`mindmatch-advance`/`wordsonar-advance`/
  // `connectduo-rematch`), anticipée dès la conception.
  | { t: "edgeletters-advance"; round: number };
