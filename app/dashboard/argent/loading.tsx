import { Skeleton, SkeletonCarte } from "@/components/ui/Skeleton";

// Squelette de la page Argent (refonte 03/10) : sa vraie forme vidée —
// le titre, le total, un bloc de lignes (règle 11 du langage).
export default function ChargementArgent() {
  return (
    <div className="max-w-2xl px-4 pb-8 pt-5 sm:p-8" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-8 w-32 rounded-full" />
      <Skeleton className="mt-6 h-8 w-48 rounded-full" />
      <Skeleton className="mt-3 h-3 w-40 rounded-full" />
      <Skeleton className="mt-9 h-5 w-44 rounded-full" />
      <div className="mt-2.5 flex flex-col gap-2">
        <SkeletonCarte />
        <SkeletonCarte />
        <SkeletonCarte />
      </div>
    </div>
  );
}
