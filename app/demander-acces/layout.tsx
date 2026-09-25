import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";

// app/demander-acces/page.tsx est un composant client ("use client", à
// cause de useSearchParams pour gérer le lien de parrainage) — un
// composant client ne peut pas exporter `metadata` dans Next.js App
// Router. Ce layout serveur, lui, le peut, et enveloppe simplement la
// page sans rien changer visuellement.
// 25/09 — metaPage : adresse canonique et aperçu de partage propres à
// la page (avant, ils étaient hérités de l'accueil). Voir lib/seo.ts.
export const metadata: Metadata = metaPage({
  titre: "Demander un accès à la bêta privée",
  description:
    "Rejoignez la bêta privée de Compyo, l'assistant administratif pensé pour les artisans du bâtiment. Chaque candidature est lue et examinée individuellement.",
  chemin: "/demander-acces",
});

export default function DemanderAccesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
