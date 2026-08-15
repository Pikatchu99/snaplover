// Protocole du data channel "ctrl" pour une room Word Sonar — jamais mélangé
// avec les autres protocoles (photo/Doodle Duel/Mind Match). Voir
// hooks/use-word-sonar-session.ts. Le mot secret de chacun·e ne transite
// JAMAIS sur le réseau — seule la réponse (positions d'une lettre, ou
// correct/incorrect d'une tentative) est envoyée, calculée localement par
// qui répond à partir de SON PROPRE mot.
export type WordSonarMessage =
  // Envoyé par l'hôte au clic sur "Lancer la partie" — communique la
  // longueur de mot choisie (même rôle que "duel-round-start" pour démarrer
  // la partie, mais une seule fois : la longueur ne change jamais en cours
  // de partie, seul le mot secret change à chaque manche).
  | { t: "wordsonar-start"; length: number }
  // Envoyé par chacun·e dès que son mot secret (de la bonne longueur) est
  // posé — jamais le mot lui-même. Dès que les DEUX ont envoyé ce message
  // pour la manche courante, les deux côtés basculent en phase "playing".
  | { t: "wordsonar-word-ready" }
  // Question posée par qui a la main : "as-tu la lettre X ?"
  | { t: "wordsonar-ask-letter"; letter: string }
  // Réponse calculée par qui répond, à partir de SON PROPRE mot — positions
  // vide = lettre absente, sinon la position de CHAQUE occurrence.
  | { t: "wordsonar-letter-result"; letter: string; positions: number[] }
  // Tentative de deviner le mot entier de l'autre.
  | { t: "wordsonar-guess-word"; word: string }
  // Réponse calculée par qui répond — `correct: true` termine la manche
  // immédiatement (qui a tenté vient de trouver le mot de l'autre).
  | { t: "wordsonar-guess-result"; word: string; correct: boolean }
  // Le chrono de qui avait la main s'est écoulé sans action — passe le tour,
  // même mécanisme de propriété du chrono que Doodle Duel (voir
  // hooks/use-duel-session.ts confirmStartDrawing/endRound : c'est toujours
  // le côté dont c'est le tour qui possède et déclenche son propre timeout).
  | { t: "wordsonar-turn-timeout" }
  // Première personne qui clique "Manche suivante"/"Voir le récap" après une
  // révélation — même mécanisme que "duel-next-round"/"mindmatch-advance" :
  // sans lui, chaque côté avancerait indépendamment et pourrait désynchroniser
  // la partie sur un double-clic.
  | { t: "wordsonar-advance"; round: number };
