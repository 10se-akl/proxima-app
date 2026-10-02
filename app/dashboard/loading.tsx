import { Skeleton, SkeletonCarte } from "@/components/ui/Skeleton";

// Squelette de l'accueil — voir components/ui/Skeleton.tsx pour le
// raisonnement. Refonte (02/10) : reprend la forme réelle de
// components/accueil/VueAccueil.tsx (date, titre, carte « Maintenant »,
// un bloc de lignes) plutôt que l'ancien en-tête encadré et la colonne
// de droite, qui n'existent plus.
export default function ChargementAccueil() {
  return (
    <div className="max-w-2xl px-4 pb-8 pt-5 sm:p-8" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-3 w-32 rounded-full" />
      <Skeleton className="mt-3 h-8 w-56 rounded-full" />
      <Skeleton className="mt-6 h-24 rounded-2xl" />
      <Skeleton className="mt-7 h-5 w-28 rounded-full" />
      <div className="mt-2.5 flex flex-col gap-2">
        <SkeletonCarte />
        <SkeletonCarte />
        <SkeletonCarte />
      </div>
    </div>
  );
}
