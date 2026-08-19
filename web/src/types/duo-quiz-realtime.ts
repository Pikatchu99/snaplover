// Protocole du data channel "ctrl" pour une room Duo Quiz — jamais mélangé
// avec les autres protocoles. Voir hooks/use-duo-quiz-session.ts.
//
// Volontairement plus léger que la spec générique de départ : ni le texte de
// la question/des choix, ni la durée du chrono, ni le nombre total de
// manches ne sont jamais transmis — ce sont des données PUBLIQUES partagées
// (banque statique dans les deux bundles, constantes dans config.ts), donc
// jamais négociées sur le réseau (même principe que la grille/les tailles
// de navires de Fleet Siege). Seul ce qui est réellement CHOISI par
// l'hôte (l'ordre des questions) ou PROPRE à chaque client (son propre
// verdict) traverse le réseau.
export type DuoQuizMessage =
  // Envoyé UNIQUEMENT par l'hôte, qui reste la seule autorité de manche pour
  // TOUTE la session (jamais d'alternance comme le·la dessinateur·rice de
  // Doodle Duel) — il n'y a structurellement rien à cacher ici, la banque
  // est publique des deux côtés. `questionId` suffit : chaque client résout
  // localement le prompt/les choix/la bonne réponse dans SA PROPRE locale
  // (bilingue fr/en) via lib/duo-quiz/pick-questions.ts.
  | { t: "duoquiz-round-start"; roundIndex: number; questionId: string }
  // Envoyé par CHAQUE côté dès qu'iel verrouille sa réponse (ou que son
  // propre chrono local expire sans réponse) — ne porte JAMAIS le choix
  // exact, seulement le verdict (déjà calculé localement via la banque
  // publique) : rien de plus n'est nécessaire pour le score, et la bonne
  // réponse n'est de toute façon une information nouvelle pour personne.
  | { t: "duoquiz-answer-result"; roundIndex: number; correct: boolean }
  // Balise de synchronisation UNIQUEMENT — envoyée par l'hôte dès que les
  // deux verdicts sont connus OU que son propre chrono de manche expire
  // (le premier des deux). Ne porte pas `correctIndex` : les deux côtés
  // peuvent déjà le retrouver localement via `questionId`. Son seul rôle est
  // de garantir que les deux écrans révèlent la bonne réponse au MÊME
  // instant, jamais chacun de son côté sur son propre chrono local (ça
  // ferait apparaître la réponse en avance chez qui a fini son décompte en
  // premier — voir CLAUDE.md).
  | { t: "duoquiz-round-end"; roundIndex: number }
  // Envoyé par l'hôte à la place du prochain "duoquiz-round-start" une fois
  // la dernière manche jouée — porte le score final comme filet de sécurité
  // canonique (au cas où un "duoquiz-answer-result" se serait perdu en
  // route), pour que les deux côtés affichent toujours le même score final
  // au récap plutôt que deux totaux qui auraient dérivé.
  | { t: "duoquiz-game-over"; hostScore: number; guestScore: number };
