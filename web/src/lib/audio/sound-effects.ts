// Sons de la séance (compte à rebours, déclenchement) — générés à la volée
// via Web Audio (oscillateurs), pas de fichier audio à héberger/licencier.
// Chaque appareil joue son propre son localement au moment où IL capture/
// décompte — pas de synchronisation réseau nécessaire.

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function playTone(frequency: number, durationMs: number, type: OscillatorType, gainPeak: number) {
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000);
}

// Bip bref à chaque seconde du compte à rebours 3·2·1.
export function playCountdownTick() {
  playTone(880, 90, "sine", 0.12);
}

// Deux tons rapprochés façon "clic" d'obturateur, joué à l'instant de la capture.
export function playShutter() {
  playTone(1400, 60, "square", 0.1);
  setTimeout(() => playTone(600, 80, "square", 0.08), 50);
}
