import { LandingImmersive } from "@/components/marketing/LandingImmersive";

// ============================================================
// Refonte navigation (Module 16, voir supabase/schema.sql) : Axel veut que
// le site vitrine et l'app fonctionnent comme un seul produit, sans jamais
// avoir besoin de se déconnecter pour naviguer de l'un à l'autre. On ne
// redirige donc plus un artisan connecté vers /dashboard ici — le Header
// (voir components/marketing/LandingPage.tsx, réutilisé par
// LandingImmersive) détecte simplement la session et affiche "Dashboard" à
// la place de "Connexion"/"Rejoindre la bêta", pour qu'il puisse revenir
// sur l'accueil marketing librement.
//
// Nouvelle direction artistique (validée par Axel après essai sur
// /apercu-immersif) : accueil immersif sombre, storytelling visuel plutôt
// que liste de fonctionnalités. L'ancienne landing (LandingPage.tsx) reste
// dans le repo, inchangée, au cas où — simplement plus utilisée ici.
// ============================================================

export default function HomePage() {
  return <LandingImmersive />;
}
