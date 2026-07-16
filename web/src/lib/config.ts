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
    gap: 12,
    margin: 30,
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
} as const;
