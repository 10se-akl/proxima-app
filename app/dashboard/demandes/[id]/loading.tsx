import { Skeleton, SqueletteGroupe } from "@/components/ui/Skeleton";

// Refonte (02/10) — la fiche projet est l'écran le plus ouvert, et elle
// n'avait pas de squelette : on voyait celui de l'accueil, puis
// « Chargement… ». Celui-ci reprend sa vraie forme.
// Design v3 (24/10) : le retour « ‹ Projets », le nom en 30 px, la ligne
// d'étiquette, les trois tuiles (Appeler / Message / Itinéraire, 68 px,
// rayon 16), le cordeau en cinq segments, puis une carte de lignes.
export default function ChargementFiche() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 min-[400px]:px-5 sm:p-8 lg:p-10 lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="mt-6 h-[1.875rem] w-52 rounded-full sm:h-9" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-full" />
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <Skeleton className="h-[68px] rounded-[16px]" />
        <Skeleton className="h-[68px] rounded-[16px]" />
        <Skeleton className="h-[68px] rounded-[16px]" />
      </div>
      <div className="mt-5 grid grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-1.5 rounded-full" />
        ))}
      </div>
      <div className="mt-8">
        <SqueletteGroupe lignes={3} />
      </div>
    </div>
  );
}
