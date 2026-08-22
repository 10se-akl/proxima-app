import type { Metadata } from "next";

// app/demander-acces/page.tsx est un composant client ("use client", à
// cause de useSearchParams pour gérer le lien de parrainage) — un
// composant client ne peut pas exporter `metadata` dans Next.js App
// Router. Ce layout serveur, lui, le peut, et enveloppe simplement la
// page sans rien changer visuellement.
export const metadata: Metadata = {
  title: "Demander un accès à la bêta privée — Compyo",
  description:
    "Rejoignez la bêta privée de Compyo, l'assistant administratif pensé pour les artisans du bâtiment. Chaque candidature est lue et examinée individuellement.",
};

export default function DemanderAccesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
