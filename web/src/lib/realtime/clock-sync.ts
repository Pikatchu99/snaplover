import type { RealtimeChannel } from "@/lib/realtime/channel";

export interface ClockSyncSample {
  offset: number;
  rtt: number;
}

const SYNC_SAMPLES = 8;
const SYNC_INTERVAL_MS = 400;

// Estime le décalage d'horloge invité → hôte (l'hôte reste la référence,
// offset = 0). Garde l'échantillon au RTT le plus petit (le plus fiable).
// Algorithme validé par le spike — voir SNAPROOM-SPEC.md §9.
export function startClockSync(channel: RealtimeChannel, onUpdate: (sample: ClockSyncSample) => void) {
  const samples: ClockSyncSample[] = [];
  let sent = 0;

  const unsubscribe = channel.onMessage((message) => {
    if (message.t !== "pong") return;
    const r = Date.now();
    const rtt = r - message.c;
    const offset = message.s + rtt / 2 - r;
    samples.push({ offset, rtt });
    samples.sort((a, b) => a.rtt - b.rtt);
    onUpdate(samples[0]);
  });

  const interval = setInterval(() => {
    if (sent++ >= SYNC_SAMPLES) {
      clearInterval(interval);
      return;
    }
    channel.send({ t: "ping", c: Date.now() });
  }, SYNC_INTERVAL_MS);

  return () => {
    clearInterval(interval);
    unsubscribe();
  };
}

export function respondToPing(channel: RealtimeChannel, c: number) {
  channel.send({ t: "pong", c, s: Date.now() });
}
