// Constantes de config applicatives — protocole temps réel, capture,
// composition. Point d'entrée unique pour tout ce qui est "tunable" côté
// produit (à ne pas confondre avec les valeurs d'infra, qui viennent de
// process.env — voir CLAUDE.md "Aucune valeur d'infra en dur").

export const config = {
  clockSync: {
    /** Nombre d'échantillons ping/pong avant de figer l'offset d'horloge. */
    samples: 8,
    intervalMs: 400,
  },
  capture: {
    /** Délai avant déclenchement (laisse le temps au countdown visuel). */
    leadMs: 3200,
    /** Pause entre deux poses avant la prochaine capture auto. */
    autoAdvanceDelayMs: 1200,
    /** Attente max d'une frame décodée avant d'abandonner la capture. */
    videoReadyTimeoutMs: 2000,
    maxWidth: 900,
    jpegQuality: 0.82,
  },
  imageTransfer: {
    /** Taille des chunks (caractères) pour l'envoi d'image sur le data channel. */
    chunkSize: 12_000,
  },
  turnEphemeral: {
    ttlSeconds: 3600,
    label: "snaplover",
  },
  strip: {
    // Marge/gap épaissis (étaient 12/30) pour que le cadre se remarque
    // vraiment autour et entre les photos, pas juste un filet — retour
    // utilisateur après comparaison avec une vraie bande photobooth.
    gap: 22,
    margin: 48,
    /** Rayon des coins arrondis de chaque case (photo ou sticker). */
    cellCornerRadius: 14,
    footerHeight: 54,
    layout: {
      vertical: { cellWidth: 450, cellHeight: 600, columns: 1 },
      grid: { cellWidth: 300, cellHeight: 400, columns: 2 },
    },
  },
  roomCode: {
    length: 5,
    /** Sans ambigus : exclut O/0, I/1. */
    charset: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  },
  roomConfig: {
    defaultPoses: 3,
    validPoses: [3, 4] as const,
  },
  participant: {
    nameMaxLength: 24,
  },
  doodle: {
    /** Épaisseur du trait relative à la largeur du canvas (min. absolu 3px). */
    lineWidthRatio: 0.012,
  },
  duel: {
    /** Nombre de manches par partie — impair pour ne jamais finir à égalité
     * sur "qui a dessiné en dernier" (détail cosmétique, pas un vrai souci
     * de règle du jeu, mais plus satisfaisant). */
    rounds: 3,
    /** Chrono par manche — généreux (voir CLAUDE.md, leçon du 3·2·1 de Duo
     * Doodle) : dessiner ET deviner prend largement plus de 3 secondes. */
    roundDurationMs: 60_000,
  },
  wordSonar: {
    rounds: 3,
    /** Longueur de mot proposée par défaut à l'hôte (voir CLAUDE.md "Word
     * Sonar") — bornes larges pour rester jouable en français (min. 4,
     * max. 8, au-delà l'alphabet 26 lettres devient dur à mémoriser). */
    defaultLength: 6,
    minLength: 4,
    maxLength: 8,
    /** Chrono par tour — qui a la main possède et déclenche son propre
     * timeout (même principe que `duel.roundDurationMs`), passe le tour si
     * personne n'agit à temps. */
    turnDurationMs: 30_000,
  },
  edgeLetters: {
    /** Nombre de manches — toujours jouées jusqu'au bout même si le score
     * est déjà joué (même simplicité que les autres jeux : pas d'arrêt
     * anticipé à gérer). */
    rounds: 5,
    /** Chrono de choix de lettre — purement LOCAL (voir CLAUDE.md "Edge
     * Letters") : si non choisie à temps, le client tire lui-même une
     * lettre au hasard, aucune coordination réseau nécessaire pour ce
     * repli. Généreux, même leçon que les autres jeux : jamais de pression
     * de temps surprise. */
    pickDurationMs: 15_000,
    /** Chrono de course — démarre symétriquement des deux côtés à l'entrée
     * en phase "racing", mais seul le·la arbitre de la manche (voir
     * adjudicatorIsInitiator) déclenche le verdict de match nul à son
     * expiration ; l'autre côté ne fait qu'afficher un compte à rebours. */
    raceDurationMs: 45_000,
  },
  fleetSiege: {
    /** Grille identique pour les deux joueur·euses — centralisée ici pour que
     * les deux clients s'accordent toujours sur les coordonnées légales sans
     * jamais échanger la dimension de la grille (voir CLAUDE.md). */
    gridSize: 8,
    /** 3 navires par joueur·euse, tailles décroissantes — volontairement plus
     * petit que la bataille navale classique (10x10, 5 navires) pour garder
     * des parties courtes, cohérent avec le positionnement "session rapide"
     * des autres jeux du hub. */
    shipSizes: [4, 3, 2] as const,
  },
  duoQuiz: {
    /** Nombre de questions par partie — piochées sans remise dans la banque
     * complète (voir lib/duo-quiz/pick-questions.ts). */
    rounds: 8,
    /** Fenêtre de réponse par question — nettement plus court que les 60s de
     * Doodle Duel : la mémoire d'un fait est immédiate, contrairement à
     * dessiner, pas besoin d'un chrono généreux ici. */
    roundDurationMs: 15_000,
    /** Pause d'affichage de la bonne réponse avant d'enchaîner
     * automatiquement sur la question suivante (aucun clic manuel — voir
     * CLAUDE.md "Duo Quiz", contrairement à "Manche suivante" d'Edge
     * Letters/Word Sonar). */
    revealPauseMs: 1500,
  },
  copyCat: {
    /** Pair (contrairement à l'impair de Doodle Duel, qui évite une égalité
     * "qui a dessiné en dernier") : Copy Cat veut un partage 50/50 exact
     * poseur·se/mimique sur le match, jamais un tour de plus d'un côté. */
    rounds: 4,
    /** Opacité du calque fantôme (référence semi-transparente superposée à
     * la caméra du·de la mimique) — assez visible pour guider la pose,
     * assez faible pour voir sa propre caméra derrière. */
    ghostOpacity: 0.35,
  },
  reflexMatch: {
    /** Best-of-7, impair (même raison que Doodle Duel) — mais une manche
     * NULLE (personne n'a tapé à temps) peut encore laisser une égalité au
     * score final, gérée par la mort subite (voir CLAUDE.md). */
    rounds: 7,
    /** Fenêtre "prêt ?" avant révélation — nettement plus courte que les
     * 3,2s de la photo (pas de 3·2·1 visuel à afficher, juste un
     * placeholder qui pulse). */
    leadMs: 1200,
    /** Délai maximal après révélation avant qu'une manche sans tap valide
     * des deux côtés ne soit déclarée nulle — laisse le temps au message
     * de l'autre côté d'arriver avant de conclure trop vite (voir
     * CLAUDE.md : ne jamais transformer une latence réseau normale en
     * défaite injustifiée). */
    roundTimeoutMs: 5_000,
  },
  challenge: {
    /** Largeur colonne sticker relative à cellWidth — voir docs/STICKER-CHALLENGES.md
     * (décision produit : même taille que les photos, ou au maximum 25% plus petit). */
    stickerWidthRatio: 1,
    /** Phase de lecture/préparation (sticker affiché, pas de décompte) avant
     * le 3·2·1 — voir docs/STICKER-CHALLENGES.md "Décisions validées". Fixe
     * pour tout le monde au MVP ; à rendre configurable si trop court/long
     * selon les stickers une fois testé en usage réel. */
    revealMs: 4000,
  },
} as const;
