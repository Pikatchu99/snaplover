// Protocole du data channel "ctrl" pour une room Word Sonar — jamais mélangé
// avec les autres protocoles (photo/Doodle Duel/Mind Match). Voir
// hooks/use-word-sonar-session.ts. Le mot secret de chacun·e ne transite
// JAMAIS sur le réseau tant que la partie est en cours — seule la réponse
// à une tentative (correct/incorrect) est envoyée, calculée localement par
// qui répond à partir de SON PROPRE mot. Pas de protocole pour "as-tu telle
// lettre ?" : cette conversation se passe entièrement à l'oral (caméra/micro
// déjà branchés), l'app n'a rien à en savoir.
export type WordSonarMessage =
  // Envoyé par l'hôte au clic sur "Lancer la partie" — communique la
  // longueur de mot choisie, jamais rechangée en cours de partie.
  | { t: "wordsonar-start"; length: number }
  // Envoyé par chacun·e dès que son mot secret (de la bonne longueur) est
  // posé — jamais le mot lui-même. Dès que les DEUX ont envoyé ce message,
  // les deux côtés basculent en phase "playing".
  | { t: "wordsonar-word-ready" }
  // Tentative de deviner le mot entier de l'autre — jamais soumise à un
  // tour (voir CLAUDE.md "Word Sonar" : un retour utilisateur réel a montré
  // que faire attendre son tour pour donner une réponse qu'on connaît déjà
  // est une mauvaise expérience). Possible à tout moment dès la phase
  // "playing", des deux côtés à la fois si besoin.
  | { t: "wordsonar-guess-word"; word: string }
  // Réponse calculée par qui répond, à partir de SON PROPRE mot —
  // `correct: true` termine la partie immédiatement (qui a tenté vient de
  // trouver le mot de l'autre) ; `correct: false` ne fait RIEN d'autre que
  // notifier l'échec, la partie continue normalement.
  | { t: "wordsonar-guess-result"; word: string; correct: boolean }
  // Envoyé par qui vient d'apprendre la fin de partie (victoire ou match
  // nul) pour révéler SON PROPRE mot à l'autre côté — sans ce message,
  // qui a perdu (ou les deux, en cas de match nul) n'apprendrait jamais le
  // mot qu'iel n'a pas réussi à deviner.
  | { t: "wordsonar-reveal"; word: string }
  // Le chrono global de partie (voir config.wordSonar.gameDurationMs,
  // actif UNIQUEMENT si la connexion passe par le relais TURN — voir
  // CLAUDE.md) s'est écoulé sans qu'aucun côté ne devine : match nul.
  // Envoyé UNE SEULE FOIS par l'hôte, seul propriétaire de ce chrono (même
  // principe que les chronos par manche des autres jeux — toujours un seul
  // côté qui possède et déclenche un timeout, jamais les deux).
  | { t: "wordsonar-timeout" };
