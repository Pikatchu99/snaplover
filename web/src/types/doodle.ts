// Dessin collaboratif en direct pendant la séance — voir hooks/use-doodle.ts.
// Points normalisés [0,1]x[0,1] dans le même repère que la frame vidéo brute
// capturée (lib/capture/capture-frame.ts) : DoodleCanvas corrige déjà le
// miroir CSS au moment de convertir la position du pointeur, donc ce même
// canvas peut être incrusté tel quel sur la photo finale sans transformation
// supplémentaire.

export interface DoodlePoint {
  x: number;
  y: number;
}

export interface DoodleStroke {
  id: string;
  color: string;
  points: DoodlePoint[];
}
