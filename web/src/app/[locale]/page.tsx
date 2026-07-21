import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/landing/Logo";
import { HeroStrips } from "@/components/landing/HeroStrips";
import { InlineJoinField } from "@/components/landing/InlineJoinField";
import { PackOfTheDay } from "@/components/landing/PackOfTheDay";
import { Link } from "@/i18n/navigation";
import { SITE_URL } from "@/lib/site";
import { getDailyChallenge } from "@/lib/stickers/daily-pack";

// Photos de démo (chats/chiens, pas de vrais visages — voir CLAUDE.md).
// 6 par bande décorative : images[i*2]/[i*2+1] = paire par case.
const STRIP_A_IMAGES = Array.from({ length: 6 }, (_, i) => `/preview/photo-${String(i + 1).padStart(2, "0")}.jpeg`);
const STRIP_B_IMAGES = Array.from({ length: 6 }, (_, i) => `/preview/photo-${String(i + 7).padStart(2, "0")}.jpeg`);

interface Step {
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface LandingPageProps {
  params: Promise<{ locale: string }>;
}

// Page pré-générée en HTML statique au build (voir generateStaticParams dans
// layout.tsx) — sans revalidation, getDailyChallenge() ne s'exécuterait
// qu'une seule fois au build/déploiement et le "Pack du jour" resterait figé
// indéfiniment au lieu de changer chaque jour UTC. ISR (revalidation par
// intervalle, pas de webhook/rebuild nécessaire) régénère la page en
// arrière-plan au plus une fois par heure — délai négligeable pour une
// feature ludique, pas une donnée critique.
export const revalidate = 3600;

// Landing (E1) — SNAPROOM-SPEC.md §12. Fond clair ; hero split avec panneau
// sombre décoratif sur desktop, voir docs/design/snaproom-hifi.dc.html.
// Sections éditoriales (comment ça marche / pourquoi / pour qui / FAQ) ajoutées
// suite à docs/SEO-COPY-AUDIT.md (P1 — landing trop pauvre en contenu indexable).
export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Données structurées schema.org (WebApplication) — contenu 100% statique et
  // maîtrisé par ce fichier (pas d'entrée utilisateur), voir CLAUDE.md OWASP
  // #5 : le `dangerouslySetInnerHTML` ci-dessous ne pose donc pas le risque
  // XSS visé par cette règle (elle s'applique au contenu non maîtrisé).
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("seo.siteName"),
    description: t("seo.defaultDescription"),
    url: SITE_URL,
    applicationCategory: "PhotoApplication",
    operatingSystem: "Any browser with WebRTC (Chrome, Firefox, Safari, Edge)",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
  };

  const steps = t.raw("landing.howItWorks.steps") as Step[];
  const faqItems = t.raw("landing.faq.items") as FaqItem[];
  const dailyChallenge = getDailyChallenge();

  return (
    <>
      <main className="flex min-h-screen flex-col bg-[#fbf7f1] md:flex-row">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pt-16 pb-24 text-center md:items-start md:justify-center md:px-16 md:py-0 md:text-left">
          <Logo />

          <div className="flex max-w-xl flex-col items-center gap-5 md:items-start lg:max-w-2xl">
            <h1 className="font-heading text-4xl font-extrabold text-[#1c1712] sm:text-5xl lg:text-6xl">
              {t("landing.titlePrefix")} <span className="text-[#fb5a46]">{t("landing.titleHighlight")}</span>
            </h1>
            <p className="text-base text-[#8c8378] sm:text-lg lg:text-xl">{t("landing.subtitle")}</p>
          </div>

          <HeroStrips stripAImages={STRIP_A_IMAGES} stripBImages={STRIP_B_IMAGES} className="pr-10 pb-6 md:hidden" />

          <div className="flex flex-col items-center gap-3 sm:flex-row md:items-start">
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
            >
              {t("landing.createCta")}
              <ArrowRight className="size-4" />
            </Link>
            <InlineJoinField />
          </div>

          <p className="text-xs text-[#8c8378]">{t("landing.noAccount")}</p>
        </div>

        <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-[#161319] md:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(251,90,70,0.25),transparent_60%)]" />
          <HeroStrips
            stripAImages={STRIP_A_IMAGES}
            stripBImages={STRIP_B_IMAGES}
            large
            className="relative pr-10 pb-6"
          />
        </div>
      </main>

      <PackOfTheDay packId={dailyChallenge.packId} stickerIds={dailyChallenge.stickerIds} />

      <section className="bg-[#fbf7f1] px-6 py-16 md:px-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <h2 className="font-heading text-center text-2xl font-extrabold text-[#1c1712] sm:text-3xl">
            {t("landing.howItWorks.title")}
          </h2>
          <ol className="grid gap-6 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col gap-2 rounded-2xl border border-[#ece4d8] bg-white p-6 text-center sm:text-left"
              >
                <span className="font-heading text-sm font-bold text-[#fb5a46]">{`0${index + 1}`}</span>
                <h3 className="font-heading text-lg font-bold text-[#1c1712]">{step.title}</h3>
                <p className="text-sm text-[#8c8378]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white px-6 py-16 md:px-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <h2 className="font-heading text-2xl font-extrabold text-[#1c1712] sm:text-3xl">
            {t("landing.why.title")}
          </h2>
          <p className="text-base text-[#8c8378] sm:text-lg">{t("landing.why.description")}</p>
        </div>
      </section>

      <section className="bg-[#fbf7f1] px-6 py-16 md:px-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <h2 className="font-heading text-2xl font-extrabold text-[#1c1712] sm:text-3xl">
            {t("landing.forWhom.title")}
          </h2>
          <p className="text-base text-[#8c8378] sm:text-lg">{t("landing.forWhom.description")}</p>
        </div>
      </section>

      <section className="bg-white px-6 py-16 md:px-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <h2 className="font-heading text-center text-2xl font-extrabold text-[#1c1712] sm:text-3xl">
            {t("landing.faq.title")}
          </h2>
          <dl className="flex flex-col divide-y divide-[#ece4d8]">
            {faqItems.map((item) => (
              <div key={item.question} className="flex flex-col gap-1 py-4">
                <dt className="font-heading text-base font-bold text-[#1c1712]">{item.question}</dt>
                <dd className="text-sm text-[#8c8378]">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
