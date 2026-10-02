import { Skeleton, SkeletonCarte } from "@/components/ui/Skeleton";

// Refonte (02/10) — la fiche projet est l'écran le plus ouvert, et elle
// n'avait pas de squelette : on voyait celui de l'accueil, puis
// « Chargement… ». Celui-ci reprend sa vraie forme : retour, nom du
// client, trois tuiles (Appeler / Message / Itinéraire), puis
// « Maintenant » et quelques lignes.
export default function ChargementFiche() {
  return (
    <div className="max-w-2xl px-4 pb-8 pt-5 sm:p-8" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-4 w-20 rounded-full" />
      <Skeleton className="mt-5 h-8 w-48 rounded-full" />
      <Skeleton className="mt-2 h-4 w-64 rounded-full" />
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <Skeleton className="h-[68px] rounded-2xl" />
        <Skeleton className="h-[68px] rounded-2xl" />
        <Skeleton className="h-[68px] rounded-2xl" />
      </div>
      <Skeleton className="mt-7 h-40 rounded-2xl" />
      <div className="mt-7 flex flex-col gap-2.5">
        <SkeletonCarte />
        <SkeletonCarte />
      </div>
    </div>
  );
}
