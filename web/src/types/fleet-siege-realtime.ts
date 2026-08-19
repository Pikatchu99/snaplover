import type { FleetSiegeCell, FleetSiegeSunkShip } from "@/types/fleet-siege";

// Protocole du data channel "ctrl" pour une room Fleet Siege — jamais mélangé
// avec les autres protocoles. Voir hooks/use-fleet-siege-session.ts.
export type FleetSiegeMessage =
  // Envoyé une seule fois par l'hôte au clic sur "Lancer la partie" — fait
  // passer l'invité·e de la salle d'attente à la phase de placement. Même
  // rôle que connectduo-start/edgeletters-start : les deux côtés doivent
  // démarrer ensemble.
  | { t: "siege-start" }
  // Envoyé une seule fois par chaque joueur·euse dès que sa flotte est
  // placée et confirmée — jamais accompagné du plateau lui-même (voir
  // CLAUDE.md : la flotte ne quitte jamais l'appareil de qui l'a placée
  // avant la fin de partie). Chaque côté garde un flag localReady/peerReady
  // indépendant ; la transition vers la bataille exige le ET des deux, pas
  // "j'ai envoyé le mien donc je démarre" — un booléen idempotent par
  // nature (recevoir ce message deux fois ne change rien).
  | { t: "siege-ready" }
  // Tir de l'attaquant·e sur une coordonnée du plateau adverse. `shotIndex`
  // est le compteur de tour partagé, déduit localement des deux côtés
  // (jamais transmis comme "à toi de jouer" séparé) — la défense revalide
  // sa parité avant de répondre et ignore silencieusement toute
  // incohérence (tir dupliqué/désordonné).
  | { t: "siege-fire"; row: number; col: number; shotIndex: number }
  // Réponse du·de la propriétaire de la flotte, calculée entièrement à
  // partir de SON PROPRE plateau — jamais envoyée par l'attaquant·e.
  // `sunkShip` n'apparaît que sur le tir exact qui coule un navire, et ne
  // porte QUE les cellules de ce navire (jamais le reste du plateau) pour
  // que l'attaquant·e ne lève le brouillard que sur ce navire précis.
  // `gameOver` est décidé par le·la propriétaire lui-même/elle-même à
  // l'instant où son dernier navire est coulé — aucun message de fin de
  // partie séparé qui pourrait arriver en course avec ce dernier résultat.
  | {
      t: "siege-fire-result";
      row: number;
      col: number;
      shotIndex: number;
      result: "hit" | "miss";
      sunkShip?: FleetSiegeSunkShip;
      gameOver: boolean;
    }
  // Envoyé par CHAQUE côté (gagnant·e et perdant·e symétriquement) dès que
  // gameOver est localement vrai — le seul message du protocole qui expose
  // jamais un plateau complet, et seulement une fois l'issue déjà décidée :
  // purement cosmétique pour l'écran de révélation côte à côte.
  | { t: "siege-reveal-board"; ships: { id: string; cells: FleetSiegeCell[] }[] }
  // Envoyé par qui clique "Rejouer" en premier — `id` incrémente à chaque
  // partie (sert aussi de compteur de match pour alterner qui tire en
  // premier, voir shooterForShot dans le hook), gardé par une ref locale
  // contre un double-déclenchement (même garde d'idempotence que
  // connectduo-rematch/edgeletters-advance).
  | { t: "siege-rematch"; id: number };
