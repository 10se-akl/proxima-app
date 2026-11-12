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
  titre: "Créer votre compte Compyo",
  description:
    "Créez votre compte Compyo, le compagnon administratif des artisans du bâtiment : gratuit pendant la bêta, sans carte bancaire, votre espace s'ouvre tout de suite.",
  chemin: "/demander-acces",
});

export default function DemanderAccesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
