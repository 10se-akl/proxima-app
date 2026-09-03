import type { Metadata } from "next";
import { LandingImmersive } from "@/components/marketing/LandingImmersive";

// Page 100% isolée, non liée à la landing en production : sert uniquement
// à faire valider à Axel une nouvelle direction artistique en local, avant
// toute décision de remplacer réellement app/page.tsx. On la retire du
// référencement pour ne pas la faire apparaître comme une vraie page du
// site tant qu'elle n'est qu'un brouillon.
export const metadata: Metadata = {
  title: "Aperçu immersif (brouillon)",
  description: "Brouillon interne — nouvelle direction artistique pour la landing Compyo.",
  robots: { index: false, follow: false },
};

export default function ApercuImmersifPage() {
  return <LandingImmersive />;
}
