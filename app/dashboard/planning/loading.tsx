import { Skeleton } from "@/components/ui/Skeleton";
import { CARTE } from "@/components/ui/recettes";

// Design v3 (24/10) : la vraie forme du planning, vidée.
export default function ChargementPlanning() {
  return (
    <>
      {/* Téléphone (refonte 03/10, règle 11) : la semaine (‹ dates ›) puis
          une ligne par jour — le repère du jour à gauche, une carte de
          rendez-vous (rayon 20, 68 px) ou « Libre » et son +. */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 min-[400px]:px-5 sm:p-8 lg:hidden lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10" aria-busy="true" aria-label="Chargement">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-3.5 w-9 rounded-full" />
                <Skeleton className="h-7 w-8 rounded-full" />
              </div>
              {i % 2 === 0 ? (
                <div className={`flex min-h-[4.25rem] items-center gap-3 px-4 ${CARTE}`}>
                  <Skeleton className="h-10 w-10 shrink-0 rounded-[12px]" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-2/5 rounded-full" />
                    <Skeleton className="mt-2 h-3.5 w-3/5 rounded-full" />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[4.25rem] items-center justify-between pl-4">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ordinateur : l'en-tête et la grille de la semaine. */}
      <div className="mx-auto hidden w-full max-w-5xl p-10 lg:block lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10" aria-busy="true" aria-label="Chargement">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Skeleton className="h-9 w-40 rounded-full" />
            <Skeleton className="mt-3 h-4 w-48 rounded-full" />
          </div>
          <Skeleton className="h-12 w-64 rounded-[14px]" />
        </div>
        <div className={`mt-6 h-[420px] p-5 ${CARTE}`}>
          <Skeleton className="h-full rounded-[14px]" />
        </div>
      </div>
    </>
  );
}
