import { LandingPage } from "@/components/marketing/LandingPage";

// ============================================================
// Refonte navigation (Module 16, voir supabase/schema.sql) : Axel veut que
// le site vitrine et l'app fonctionnent comme un seul produit, sans jamais
// avoir besoin de se déconnecter pour naviguer de l'un à l'autre. On ne
// redirige donc plus un artisan connecté vers /dashboard ici — le Header
// (voir components/marketing/LandingPage.tsx) détecte simplement la
// session et affiche "Dashboard" à la place de "Connexion"/"Rejoindre la
// bêta", pour qu'il puisse revenir sur l'accueil marketing librement.
// ============================================================

export default function HomePage() {
  return <LandingPage />;
}
