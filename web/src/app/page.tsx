import Link from "next/link";
import { ArrowRight, Link as LinkIcon } from "lucide-react";
import { fr } from "@/i18n/messages";

// Landing (E1) — SNAPROOM-SPEC.md §12.
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#161319] px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4 max-w-xl">
        <h1 className="font-heading text-4xl font-extrabold text-white sm:text-5xl">{fr.landing.title}</h1>
        <p className="text-base text-white/70 sm:text-lg">{fr.landing.subtitle}</p>
      </div>

      <div className="flex gap-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-1 rounded-xl bg-white/5 p-1.5">
            <div className="h-24 w-16 rounded-md bg-linear-to-br from-white/20 to-white/5" />
            <div className="h-24 w-16 rounded-md bg-linear-to-br from-white/10 to-white/5" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/create"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {fr.landing.createCta}
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/join"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 font-medium text-white transition hover:bg-white/10"
        >
          <LinkIcon className="size-4" />
          {fr.landing.joinCta}
        </Link>
      </div>

      <p className="text-xs text-white/50">{fr.landing.noAccount}</p>
    </main>
  );
}
