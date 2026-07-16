import { fr } from "@/i18n/messages";

interface CountdownProps {
  remainingMs: number;
  poseNumber: number;
  poses: number;
}

// Overlay 3·2·1 — voir SNAPROOM-SPEC.md §12 (E5).
export function Countdown({ remainingMs, poseNumber, poses }: CountdownProps) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/40">
      <span className="text-xs font-semibold tracking-widest text-white/80 uppercase">
        {fr.countdown.prepareFor(poseNumber, poses)}
      </span>
      <span className="font-heading text-8xl font-extrabold text-white [text-shadow:0_4px_20px_rgba(251,90,70,0.6)]">
        {seconds}
      </span>
      <span className="mt-2 text-xs tracking-[0.2em] text-white">{fr.countdown.ready}</span>
    </div>
  );
}
