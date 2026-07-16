import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { HeroStrips } from "@/components/landing/HeroStrips";
import { InlineJoinField } from "@/components/landing/InlineJoinField";
import { fr } from "@/i18n/messages";

// Photos de démo (chats/chiens, pas de vrais visages — voir CLAUDE.md).
// 6 par bande décorative : images[i*2]/[i*2+1] = paire par case.
const STRIP_A_IMAGES = Array.from({ length: 6 }, (_, i) => `/preview/photo-${String(i + 1).padStart(2, "0")}.jpeg`);
const STRIP_B_IMAGES = Array.from({ length: 6 }, (_, i) => `/preview/photo-${String(i + 7).padStart(2, "0")}.jpeg`);

// Landing (E1) — SNAPROOM-SPEC.md §12. Fond clair ; hero split avec panneau
// sombre décoratif sur desktop, voir docs/design/snaproom-hifi.dc.html.
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#fbf7f1] md:flex-row">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center md:items-start md:justify-center md:px-16 md:py-0 md:text-left">
        <Logo />

        <div className="flex max-w-xl flex-col items-center gap-5 md:items-start lg:max-w-2xl">
          <h1 className="font-heading text-4xl font-extrabold text-[#1c1712] sm:text-5xl lg:text-6xl">
            {fr.landing.titlePrefix} <span className="text-[#fb5a46]">{fr.landing.titleHighlight}</span>
          </h1>
          <p className="text-base text-[#8c8378] sm:text-lg lg:text-xl">{fr.landing.subtitle}</p>
        </div>

        <HeroStrips stripAImages={STRIP_A_IMAGES} stripBImages={STRIP_B_IMAGES} className="pr-10 pb-6 md:hidden" />

        <div className="flex flex-col items-center gap-3 sm:flex-row md:items-start">
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            {fr.landing.createCta}
            <ArrowRight className="size-4" />
          </Link>
          <InlineJoinField />
        </div>

        <p className="text-xs text-[#8c8378]">{fr.landing.noAccount}</p>
      </div>

      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-[#161319] md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(251,90,70,0.25),transparent_60%)]" />
        <HeroStrips
          stripAImages={STRIP_A_IMAGES}
          stripBImages={STRIP_B_IMAGES}
          large
          dark
          className="relative pr-10 pb-6"
        />
      </div>
    </main>
  );
}
