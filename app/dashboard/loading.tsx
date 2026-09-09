import { Skeleton, SkeletonCarte } from "@/components/ui/Skeleton";

// Squelette de l'accueil — voir components/ui/Skeleton.tsx pour le
// raisonnement. Reprend la forme réelle de app/dashboard/page.tsx (bandeau
// d'en-tête, carte "Maintenant", quelques lignes de section) plutôt qu'un
// spinner générique.
export default function ChargementAccueil() {
  return (
    <div className="p-8 max-w-6xl mx-auto flex gap-10 items-start">
      <div className="max-w-2xl flex-1 min-w-0">
        <div className="rounded-3xl border border-ink/10 px-6 py-6 sm:px-8 sm:py-7">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-56 mt-3" />
        </div>

        <Skeleton className="h-16 mt-6 rounded-2xl" />

        <div className="mt-8 flex flex-col gap-2">
          <Skeleton className="h-3 w-28 mb-1" />
          <SkeletonCarte />
          <SkeletonCarte />
        </div>
      </div>
      <aside className="hidden lg:block w-72 shrink-0">
        <Skeleton className="h-40 rounded-2xl" />
      </aside>
    </div>
  );
}
