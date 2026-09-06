import type { Metadata } from "next";
import { LandingImmersiveV2 } from "@/components/marketing/LandingImmersiveV2";

// Page 100% isolée, non liée à l'accueil en production : sert à faire
// valider à Axel jusqu'où pousser le rendu visuel de l'accueil (profondeur
// 3D légère au survol, halos, grain de film — voir LandingImmersiveV2.tsx)
// avant toute décision de remplacer réellement app/page.tsx. Même
// traitement que /apercu-immersif en son temps : retirée du référencement
// tant qu'elle n'est qu'un brouillon de comparaison.
export const metadata: Metadata = {
  title: "Aperçu visuel (brouillon)",
  description: "Brouillon interne — exploration de profondeur 3D légère et d'ambiance visuelle pour l'accueil Compyo.",
  robots: { index: false, follow: false },
};

export default function ApercuVisuelPage() {
  return <LandingImmersiveV2 />;
}
