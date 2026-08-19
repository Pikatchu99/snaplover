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
    /** Longueur de mot proposée par défaut à l'hôte (voir CLAUDE.md "Word
     * Sonar") — bornes larges pour rester jouable en français (min. 4,
     * max. 8, au-delà l'alphabet 26 lettres devient dur à mémoriser). */
    defaultLength: 6,
    minLength: 4,
    maxLength: 8,
    /** Partie unique du début à la fin (pas de manches) — chrono global
     * appliqué UNIQUEMENT quand la connexion passe par le relais TURN (voir
     * CLAUDE.md "Word Sonar" — le vrai jeu se joue à l'oral entre les deux
     * joueur·euses, ce chrono existe pour borner le coût du relais, pas pour
     * rythmer la partie). Match nul si personne n'a deviné à temps. */
    gameDurationMs: 5 * 60_000,
    /** Sous ce seuil restant, l'affichage du chrono passe en rouge. */
    gameClockWarningMs: 60_000,
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
  turnRateLimit: {
    /** Limite l'émission de creds TURN par IP — le vrai point de contrôle du
     * coût de relais (voir CLAUDE.md), s'applique à TOUTE room (photo +
     * chaque mini-jeu), pas seulement à Word Sonar. Au-delà, /api/turn-
     * credentials continue de répondre (jamais un blocage total de l'app)
     * mais sans entrée TURN — le direct P2P reste possible, seul le relais
     * est coupé. Fenêtre glissante en mémoire (pas de BDD), remise à zéro à
     * chaque redéploiement — acceptable, même philosophie que les rooms
     * éphémères de signaling/. */
    maxPerWindow: 5,
    windowMs: 60 * 60_000,
  },
} as const;
