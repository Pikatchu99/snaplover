import type { Metadata } from "next";
import { fr } from "@/i18n/messages";

// `create/page.tsx` est un composant client ("use client") — l'App Router
// n'autorise pas un export `metadata` dans un fichier "use client". On passe
// donc par ce layout serveur (aucune UI propre, juste `children`) pour cette
// metadata spécifique à /create.
export const metadata: Metadata = {
  title: fr.seo.create.title,
  description: fr.seo.create.description,
  openGraph: {
    title: fr.seo.create.title,
    description: fr.seo.create.description,
  },
  twitter: {
    title: fr.seo.create.title,
    description: fr.seo.create.description,
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
