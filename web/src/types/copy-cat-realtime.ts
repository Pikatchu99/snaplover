import type { CopyCatRole, CopyCatVerdict } from "@/types/copy-cat";

// Protocole du data channel "ctrl" pour une room Copy Cat — jamais mélangé
// avec les autres protocoles NI avec le protocole `img-*`/RealtimeMessage
// de la bande photo de base (types/realtime.ts, lib/capture/image-transfer.ts) :
// celui-là est câblé en dur sur RealtimeChannel/RealtimeMessage et ne
// connaît qu'UN SEUL transfert d'image possible à la fois dans la vie du
// canal — ici, DEUX transferts logiquement distincts (référence du
// poseur, puis tentative du mimique) se succèdent à chaque manche, d'où le
// tag (round, role) sur chaque transfert (voir hooks/use-copy-cat-session.ts).
export type CopyCatMessage =
  // Envoyé UNE SEULE FOIS par l'invité·e dès que son listener réseau est
  // attaché — même rôle que connectduo-hello/duel-hello : l'hôte (toujours
  // poseur·se de la manche 0) ne doit jamais lancer la toute première
  // manche avant d'avoir la preuve que l'invité·e écoute déjà. Un envoi
  // one-shot suffit ici (pas de renvoi périodique comme uttt-ready) car,
  // contrairement à Ultimate Tic-Tac-Toe, la manche 0 démarre derrière un
  // clic humain explicite sur "Lancer la partie" (voir CopyCatLobby.tsx) —
  // le temps de réaction humain garantit déjà que le listener de
  // l'invité·e est attaché depuis longtemps au moment du clic.
  | { t: "copycat-hello" }
  // Fait à la fois le travail de "lancer la manche 0" et de "manche
  // suivante" — jamais deux messages séparés pour le même job. `round` est
  // la cible vers laquelle on avance (0 pour le tout premier lancement),
  // jamais "la manche qu'on quitte" : la garde d'idempotence compare cette
  // cible à la dernière cible déjà appliquée (voir applyAdvance dans le
  // hook) plutôt que de porter un `id` séparé — les index de manche sont
  // déjà naturellement monotones. `round >= config.copyCat.rounds` signale
  // le passage au récap.
  | { t: "copycat-advance"; round: number }
  // Ouvre un transfert chunké (même approche ~12 Ko que
  // lib/capture/image-transfer.ts, mais jamais réutilisée telle quelle —
  // voir CLAUDE.md "Copy Cat" : ce module-là suppose un seul transfert
  // ambiant à la fois, faux ici). `round`+`role` taguent le tampon du·de
  // la destinataire pour qu'un chunk égaré d'un transfert précédent ne
  // puisse jamais s'y mélanger.
  | { t: "copycat-img-meta"; round: number; role: CopyCatRole }
  | { t: "copycat-img-chunk"; part: string }
  // Ferme le transfert — SEUL déclencheur de transition de phase
  // (mimic-prep sur role "poser", reveal potentiel sur role "mimic") :
  // jamais copycat-img-meta, qui arriverait avant que tous les chunks
  // soient là (l'overlay fantôme rendrait alors un JPEG partiel/corrompu).
  // Revalidé contre le tampon attendu (round, role) avant application —
  // un tag qui ne correspond pas est silencieusement ignoré.
  | { t: "copycat-img-end"; round: number; role: CopyCatRole }
  // Envoyé UNIQUEMENT par le·la poseur·se de la manche, après avoir vu les
  // deux clichés côte à côte — le·la mimique n'a aucun chemin de code qui
  // puisse construire ce message (interface de notation absente, pas
  // seulement désactivée) puisqu'iel ne connaît pas l'intention visée.
  | { t: "copycat-rate"; round: number; verdict: CopyCatVerdict };
