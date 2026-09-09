import { Skeleton, SkeletonCarte } from "@/components/ui/Skeleton";

// Squelette partagé par les pages "liste" du dashboard (projets, devis,
// factures) — même mise en page (p-8 max-w-4xl, titre + bouton, barre de
// recherche, lignes) sur les trois, voir components/ui/Skeleton.tsx pour
// le raisonnement d'ensemble.
export function SquelettePageListe({ titre }: { titre: string }) {
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink/20">{titre}</h1>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Skeleton className="h-10 mb-2" />
        <SkeletonCarte />
        <SkeletonCarte />
        <SkeletonCarte />
        <SkeletonCarte />
      </div>
    </div>
  );
}
