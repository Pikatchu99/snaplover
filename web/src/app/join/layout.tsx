import type { Metadata } from "next";
import { fr } from "@/i18n/messages";

// `join/page.tsx` est un composant client ("use client") — même contournement
// que app/create/layout.tsx pour la metadata propre à /join.
export const metadata: Metadata = {
  title: fr.seo.join.title,
  description: fr.seo.join.description,
  openGraph: {
    title: fr.seo.join.title,
    description: fr.seo.join.description,
  },
  twitter: {
    title: fr.seo.join.title,
    description: fr.seo.join.description,
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
