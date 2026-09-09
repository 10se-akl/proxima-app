// ============================================================
// Squelette de chargement (10/09) — recherche terrain sur la charge
// mentale des artisans du BTP + relecture Cowork de cette recherche :
// "le temps-à-premier-résultat perçu doit rester la priorité n°1", quitte
// à sacrifier un peu d'esthétique pur. Aucune des pages principales du
// dashboard (toutes des Server Components qui interrogent Supabase avant
// de rendre quoi que ce soit) n'avait de loading.tsx — chaque navigation
// laissait donc l'écran figé/blanc le temps de la requête, surtout
// pénible sur un réseau de chantier faible.
//
// Un seul composant simple (pas de librairie externe) réutilisé par tous
// les loading.tsx du dashboard, pour que chaque squelette ressemble
// vraiment à la forme du contenu qui va arriver (header, cartes, lignes)
// plutôt qu'un unique spinner générique au milieu de l'écran — ça
// communique "c'est presque là" plus efficacement qu'une simple attente.
// bg-ink/10 + animate-pulse (Tailwind natif, sans JS) : suit le thème
// clair/sombre automatiquement, comme le reste du design system.
// ============================================================
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-ink/10 ${className}`} />;
}

export function SkeletonCarte({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-ink/10 p-3.5 flex items-center gap-3 ${className}`}>
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <Skeleton className="h-4 flex-1 max-w-xs" />
    </div>
  );
}
