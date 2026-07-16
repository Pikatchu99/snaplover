// Convertit un instant cible (horloge hôte) en délai local, à partir du
// décalage d'horloge estimé par le clock-sync (offset = 0 côté hôte).
// Voir SNAPROOM-SPEC.md §9. Délai de déclenchement : config.capture.leadMs.
export function computeCaptureDelay(fireAtHost: number, offset: number): number {
  const hostNow = Date.now() + offset;
  return Math.max(0, fireAtHost - hostNow);
}
