import { Skeleton, SqueletteGroupe } from "@/components/ui/Skeleton";
import { CARTE } from "@/components/ui/recettes";

// Squelette de l'accueil — voir components/ui/Skeleton.tsx pour le
// raisonnement. Refonte (02/10) : reprend la forme réelle de
// components/accueil/VueAccueil.tsx plutôt que l'ancien en-tête encadré.
// Design v3 (24/10) : la date, « Bonjour » (30 px), la carte du haut
// (rayon 24), la carte de l'argent, puis « À faire » et ses lignes. Même
// conteneur que VueAccueil.
export default function ChargementAccueil() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 min-[400px]:px-5 sm:p-10 xl:max-w-6xl lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-4 w-32 rounded-full" />
      <Skeleton className="mt-3 h-[1.875rem] w-56 rounded-full sm:h-9" />
      {/* Le même ordre que l'accueil : la carte du haut, l'argent, puis
          « À faire » ; sur grand écran, l'argent passe à droite. */}
      <div className="mt-6 flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)] xl:items-start xl:gap-x-10">
        <div className="contents xl:block">
          <Skeleton className="order-1 h-24 rounded-[24px] xl:order-none" />
          <div className="order-3 mt-8 xl:order-none">
            <Skeleton className="h-6 w-28 rounded-full" />
            <div className="mt-2.5">
              <SqueletteGroupe lignes={3} />
            </div>
          </div>
        </div>
        <div className={`order-2 mt-4 p-5 xl:order-none xl:mt-0 ${CARTE}`}>
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="mt-3 h-9 w-40 rounded-full" />
          <Skeleton className="mt-5 h-4 w-52 max-w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
