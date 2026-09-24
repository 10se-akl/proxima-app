import type { Metadata } from "next";
import { Accueil } from "@/components/marketing/vitrine/Accueil";
import { SectionAvisGoogle } from "@/components/marketing/AvisGoogle";

// ============================================================
// Refonte navigation (Module 16, voir supabase/schema.sql) : Axel veut que
// le site vitrine et l'app fonctionnent comme un seul produit, sans jamais
// avoir besoin de se déconnecter pour naviguer de l'un à l'autre. On ne
// redirige donc pas un artisan connecté vers /dashboard ici — le Header
// détecte simplement la session et affiche "Dashboard" à la place de
// "Connexion"/"Rejoindre la bêta".
//
// 24/09 — Nouvelle vitrine : l'histoire d'une journée d'artisan, voir
// components/marketing/vitrine/Accueil.tsx. L'en-tête et le pied de page
// partagés par tout le site sont dans components/marketing/Cadre.tsx.
// ============================================================

// 24/09 — Le titre et la description suivent le nouveau message de
// l'accueil. Titre « absolu » : le gabarit « %s — Compyo » du layout
// l'aurait doublé.
const TITRE = "Compyo — Le compagnon administratif des artisans du bâtiment";
const DESCRIPTION =
  "Vos soirées ne sont pas faites pour la paperasse. Du premier message du client à la facture réglée : Compyo crée le projet, range vos notes et vos photos, prépare le devis avec vos prix et suit la signature. Bêta privée.";

export const metadata: Metadata = {
  title: { absolute: TITRE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITRE, description: DESCRIPTION, url: "/" },
  twitter: { title: TITRE, description: DESCRIPTION },
};

export default function HomePage() {
  // Les avis Google se lisent côté serveur (clé d'API privée) : la section
  // ne rend rien tant qu'il n'y a pas de fiche Google.
  return <Accueil avis={<SectionAvisGoogle />} />;
}
