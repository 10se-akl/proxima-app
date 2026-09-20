import { Accueil } from "@/components/marketing/accueil/Accueil";
import { SectionAvisGoogle } from "@/components/marketing/AvisGoogle";

// ============================================================
// Refonte navigation (Module 16, voir supabase/schema.sql) : Axel veut que
// le site vitrine et l'app fonctionnent comme un seul produit, sans jamais
// avoir besoin de se déconnecter pour naviguer de l'un à l'autre. On ne
// redirige donc pas un artisan connecté vers /dashboard ici — le Header
// détecte simplement la session et affiche "Dashboard" à la place de
// "Connexion"/"Rejoindre la bêta".
//
// 20/09 — Refonte de l'accueil : récit plutôt que sommaire, voir
// components/marketing/accueil/Accueil.tsx. L'ancienne version immersive
// (LandingImmersive.tsx) reste en place, visible sur /apercu-immersif, et
// l'ancienne landing multi-pages (LandingPage.tsx) fournit toujours le
// Header et le Footer partagés par tout le site.
// ============================================================

export default function HomePage() {
  // Les avis Google se lisent côté serveur (clé d'API privée) : la section
  // ne rend rien tant qu'il n'y a pas de fiche Google.
  return <Accueil avis={<SectionAvisGoogle />} />;
}
