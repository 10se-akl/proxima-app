import { Skeleton } from "@/components/ui/Skeleton";

export default function ChargementPlanning() {
  return (
    <>
      {/* Téléphone (refonte 03/10, règle 11) : la vraie forme de la semaine
          en sept lignes, vidée — un repère de jour et une ligne. */}
      <div className="px-4 pb-8 pt-5 sm:hidden" aria-busy="true" aria-label="Chargement">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-12 w-28 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-5 w-44 rounded-full" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2">
              <Skeleton className="mx-auto h-10 w-8 rounded-full" />
              <div className="flex min-h-16 items-center gap-3 rounded-2xl bg-surface px-4 ring-1 ring-ink/15">
                <Skeleton className="h-4 max-w-[12rem] flex-1 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden p-8 max-w-5xl sm:block">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-40 mt-2" />
          </div>
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="mt-6 h-[420px] rounded-2xl" />
      </div>
    </>
  );
}
