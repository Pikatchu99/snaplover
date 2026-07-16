import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { StripPreview } from "@/components/landing/StripPreview";
import { InlineJoinField } from "@/components/landing/InlineJoinField";
import { fr } from "@/i18n/messages";

// Landing (E1) — SNAPROOM-SPEC.md §12. Fond clair ; hero split avec panneau
// sombre décoratif sur desktop, voir docs/design/snaproom-hifi.dc.html.
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#fbf7f1] lg:flex-row">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center lg:items-start lg:justify-center lg:px-16 lg:py-0 lg:text-left">
        <Logo />

        <div className="flex max-w-xl flex-col items-center gap-4 lg:items-start">
          <h1 className="font-heading text-4xl font-extrabold text-[#1c1712] sm:text-5xl">
            {fr.landing.titlePrefix} <span className="text-[#fb5a46]">{fr.landing.titleHighlight}</span>
          </h1>
          <p className="text-base text-[#8c8378] sm:text-lg">{fr.landing.subtitle}</p>
        </div>

        <StripPreview className="lg:hidden" />

        <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
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

      <div className="relative hidden flex-1 items-center justify-center gap-6 overflow-hidden bg-[#161319] lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(251,90,70,0.25),transparent_60%)]" />
        <StripPreview className="relative -rotate-6" />
        <StripPreview cells={3} caption="À DEUX" className="relative translate-y-6 rotate-6" />
      </div>
    </main>
  );
}
