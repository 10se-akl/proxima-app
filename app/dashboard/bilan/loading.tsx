import { Skeleton, SqueletteTitre } from "@/components/ui/Skeleton";
import { CLASSE_PAGE_LARGE } from "@/components/ui/EnTetePage";
import { CARTE_PLEINE } from "@/components/ui/recettes";

// Design v3 (24/10) : la forme du Bilan — le titre et les flèches de mois,
// les quatre chiffres en cartes, puis la carte du graphique.
export default function ChargementBilan() {
  return (
    <div className={CLASSE_PAGE_LARGE} aria-busy="true" aria-label="Chargement">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SqueletteTitre />
        <div className="flex gap-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={CARTE_PLEINE}>
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="mt-3 h-8 w-24 rounded-full" />
            <Skeleton className="mt-3 h-3.5 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <div className={`mt-6 ${CARTE_PLEINE}`}>
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="mt-5 h-44 rounded-[14px] sm:h-52" />
      </div>
    </div>
  );
}
