import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";
import { AccueilCarnet } from "@/components/marketing/carnet/AccueilCarnet";

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
// 01/11/2026 — Nouvel accueil « carnet de chantier » : le look de la vitrine
// expérience et le texte « vos clients n'attendent plus », gagnants des tests
// du 01/11 (compyo/test-accueil-01-11/RESULTATS.md, hors dépôt). L'ancien
// accueil (components/marketing/vitrine/Accueil.tsx) est gardé, non affiché.
const TITRE = "Compyo — Devis, relances et factures pour artisans du bâtiment";
const DESCRIPTION =
  "Compyo range les demandes de vos clients et prépare la réponse, le devis, la relance et la facture. Vous relisez, vous envoyez de votre téléphone : rien ne part sans vous. Bêta gratuite pour les artisans du bâtiment.";

export const metadata: Metadata = metaPage({ titre: TITRE, description: DESCRIPTION, chemin: "/", titreAbsolu: true });

export default function HomePage() {
  return <AccueilCarnet />;
}
