"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StripPreview } from "@/components/landing/StripPreview";

interface HeroStripsProps {
  stripAImages: string[];
  stripBImages: string[];
  large?: boolean;
  dark?: boolean;
  className?: string;
}

const COUNTDOWN_STEPS = [3, 2, 1];

// Duo de bandes superposées (hôte devant, "à deux" derrière/décalée) — un
// petit countdown 3·2·1 joue une fois au montage, puis les cases de chaque
// bande apparaissent en cascade. Sobre (Framer Motion, 250-300ms ease-out).
export function HeroStrips({ stripAImages, stripBImages, large, dark, className }: HeroStripsProps) {
  const [step, setStep] = useState(0);
  const revealed = step >= COUNTDOWN_STEPS.length;

  useEffect(() => {
    if (revealed) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 450);
    return () => clearTimeout(timer);
  }, [step, revealed]);

  return (
    <div className={`relative isolate ${className ?? ""}`}>
      <StripPreview
        images={stripBImages}
        cells={3}
        caption="À DEUX"
        large={large}
        revealed={revealed}
        revealDelay={0.15}
        className={`absolute rotate-6 ${large ? "-right-16 top-12" : "-right-6 top-6"}`}
      />
      <StripPreview images={stripAImages} large={large} revealed={revealed} className="relative -rotate-6" />

      <AnimatePresence>
        {!revealed && (
          <motion.span
            key={COUNTDOWN_STEPS[step]}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center font-heading text-6xl font-extrabold ${
              dark ? "text-white" : "text-[#1c1712]"
            }`}
          >
            {COUNTDOWN_STEPS[step]}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
