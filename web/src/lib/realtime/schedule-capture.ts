// Délai avant déclenchement (LEAD_MS) — laisse le temps au countdown visuel
// de s'afficher des deux côtés avant la capture. Voir SNAPROOM-SPEC.md §9.
export const CAPTURE_LEAD_MS = 3200;

// Convertit un instant cible (horloge hôte) en délai local, à partir du
// décalage d'horloge estimé par le clock-sync (offset = 0 côté hôte).
export function computeCaptureDelay(fireAtHost: number, offset: number): number {
  const hostNow = Date.now() + offset;
  return Math.max(0, fireAtHost - hostNow);
}
