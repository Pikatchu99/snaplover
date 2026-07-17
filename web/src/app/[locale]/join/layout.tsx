import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// `join/page.tsx` est un composant client ("use client") — même contournement
// que app/[locale]/create/layout.tsx pour la metadata propre à /join.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.join" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    twitter: { title: t("title"), description: t("description") },
  };
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
