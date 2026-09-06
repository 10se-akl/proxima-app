import type { Metadata } from "next";
import { LandingImmersive } from "@/components/marketing/LandingImmersive";

// Mise à jour (05/09) — commentaire obsolète corrigé : la décision a été
// prise, app/page.tsx monte désormais ce même composant LandingImmersive
// en production. Cette route n'est donc plus un brouillon isolé mais un
// doublon de l'accueil, conservé comme page de travail/comparaison (utile
// pour comparer une future évolution visuelle côte à côte avec la version
// en prod). Toujours retirée du référencement pour ne pas indexer une URL
// en double de l'accueil.
export const metadata: Metadata = {
  title: "Aperçu immersif (brouillon)",
  description: "Brouillon interne — nouvelle direction artistique pour la landing Compyo.",
  robots: { index: false, follow: false },
};

export default function ApercuImmersifPage() {
  return <LandingImmersive />;
}
