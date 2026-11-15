import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";
import { PageFonctionnalites } from "@/components/marketing/carnet/PageFonctionnalites";

// 25/09 — metaPage : adresse canonique et aperçu de partage propres à
// la page (avant, ils étaient hérités de l'accueil). Voir lib/seo.ts.
export const metadata: Metadata = metaPage({
  titre: "Fonctionnalités",
  description:
    "Ce que fait Compyo, avec de vraies captures : un message devient un projet, notes dictées, devis avec vos prix, signature en ligne, relances, factures, planning.",
  chemin: "/fonctionnalites",
});

// 25/09 — La liste des fonctionnalités vit dans les données structurées
// globales (app/layout.tsx), présentes sur toutes les pages : pas de
// deuxième version ici.
//
// 15/11/2026 — la page est refaite dans le carnet de l'accueil, avec de
// vraies captures de l'application : components/marketing/carnet/
// PageFonctionnalites.tsx. Les anciens écrans dessinés (DemoDevis,
// DemoImport, DemoPlanning, DemoNotesVocales) et « Compyo évolue
// régulièrement » (SectionNouveautes) ne sont plus affichés.
export default function FonctionnalitesPage() {
  return <PageFonctionnalites />;
}
