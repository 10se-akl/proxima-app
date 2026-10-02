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
// Refonte (02/10) — règle 11 de docs/langage-interface.md : le squelette
// est la vraie ligne vidée (même hauteur, même rayon, même filet), et la
// pulsation ne joue que si l'artisan n'a pas demandé moins de mouvement.
// ============================================================
export function Skeleton({ className = "" }: { className?: string }) {
  // rounded-xl par défaut, et pas rounded-full : dans la feuille générée par
  // Tailwind, « full » passe après « 2xl » et écraserait l'arrondi demandé
  // par l'appelant. Les barres de texte passent rounded-full elles-mêmes.
  return <div className={`motion-safe:animate-pulse rounded-xl bg-ink/10 ${className}`} />;
}

/** Une ligne de liste vide, à la forme de components/accueil/Blocs.tsx. */
export function SkeletonCarte({ className = "" }: { className?: string }) {
  return (
    <div className={`flex min-h-16 items-center gap-3 rounded-2xl bg-surface px-4 ring-1 ring-ink/15 ${className}`}>
      <Skeleton className="h-4 w-12 shrink-0 rounded-full" />
      <Skeleton className="h-4 max-w-xs flex-1 rounded-full" />
    </div>
  );
}

/** Le squelette d'une page « en-tête + lignes », pour les chargements
 *  côté client (fiche, notes, paramètres, rendez-vous). */
export function SquelettePage({ lignes = 4 }: { lignes?: number }) {
  return (
    <div className="max-w-2xl px-4 pb-8 pt-5 sm:p-8" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-3 w-28 rounded-full" />
      <Skeleton className="mt-3 h-7 w-56 rounded-full" />
      <div className="mt-7 flex flex-col gap-2.5">
        {Array.from({ length: lignes }, (_, i) => (
          <SkeletonCarte key={i} />
        ))}
      </div>
    </div>
  );
}
