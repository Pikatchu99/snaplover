import type { BingoLineRef } from "@/types/bingo";

// Protocole du data channel "ctrl" pour une room Bingo — jamais mélangé
// avec les autres protocoles. Voir hooks/use-bingo-session.ts.
//
// Volontairement plus léger que la spec générique de départ sur deux
// points (voir CLAUDE.md "Bingo") : pas de "bingo-hello" — contrairement à
// Ultimate Tic-Tac-Toe (démarrage instantané sans aucun geste humain), la
// manche 0 démarre derrière un clic explicite "Lancer la partie" côté
// hôte, qui offre déjà la même marge de sécurité qu'un hello one-shot chez
// Connect Duo/Copy Cat ; et pas de "bingo-resync" dédié à la reconnexion —
// aucun autre jeu du hub n'a de reprise de connexion sur mesure, tous
// s'appuient sur la bannière de reconnexion générique déjà fournie par
// useRoomConnection.
export type BingoMessage =
  // Fait à la fois "lancer la manche 0" et "manche suivante" (voir
  // CLAUDE.md, même principe que copycat-advance/duoquiz-round-start —
  // `round` est la cible vers laquelle on avance, gardée par sa propre
  // monotonie, jamais un `id` séparé). `round >= config.bingo.rounds`
  // signale le passage au récap.
  | { t: "bingo-advance"; round: number }
  // L'engagement cryptographique du·de la donneur·se de numéros à SON
  // tirage complet (pas encore révélé) des 75 numéros — envoyé avant
  // d'appeler le premier numéro. `commitHash` = SHA-256(salt +
  // séquence.join(",")), le salt restant secret côté client jusqu'à la
  // révélation de fin de manche (voir lib/bingo/commit.ts).
  | { t: "bingo-draw-commit"; round: number; commitHash: string }
  // Un numéro appelé, un message par tic d'intervalle — `index` est la
  // position 0-indexée dans l'ordre de tirage, ce qui permettrait à un
  // côté qui rattrape un décalage de détecter un trou (non exploité ici,
  // aucune reprise de connexion sur mesure, voir plus haut — gardé pour la
  // cohérence avec la revue de conception).
  | { t: "bingo-number-called"; round: number; index: number; number: number }
  // Envoyé par N'IMPORTE LEQUEL des deux côtés dès que SA PROPRE carte
  // affiche une ligne complète — `lineNumbers` ne révèle QUE les numéros de
  // cette ligne précise (jamais le reste de la carte), suffisant pour que
  // l'autre côté vérifie intégralement sans jamais voir la carte complète
  // (même principe que Word Sonar pour le mot secret).
  | { t: "bingo-claim"; round: number; line: BingoLineRef; lineNumbers: number[] }
  // Envoyé UNIQUEMENT par le·la donneur·se de numéros, une fois la manche
  // terminée — révèle le salt et la séquence complète des 75 numéros, pour
  // que l'AUTRE côté recalcule indépendamment le hash et vérifie que
  // chaque numéro réellement diffusé correspondait à l'engagement pris
  // avant le début de la manche (le·la donneur·se n'a pas besoin de se
  // revérifier lui/elle-même : iel ne peut pas se mentir à soi-même sur sa
  // propre séquence). Une divergence est détectée, jamais corrigée
  // rétroactivement — même limite acceptée partout ailleurs dans cette
  // architecture P2P sans serveur de confiance.
  | { t: "bingo-draw-reveal"; round: number; salt: string; fullSequence: number[] };
