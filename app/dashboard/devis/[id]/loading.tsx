import { Skeleton } from "@/components/ui/Skeleton";
import { CARTE } from "@/components/ui/recettes";

// Sans ce fichier, c'est le squelette de la LISTE des devis
// (app/dashboard/devis/loading.tsx) qui s'afficherait en ouvrant un devis.
// Design v3 (24/10) : le retour, le titre en 30 px, puis la carte du
// devis (rayon 20) et, sur grand écran, l'aperçu du document.
export default function Chargement() {
  return (
    <div className="w-full px-4 pb-10 pt-6 min-[400px]:px-5 sm:p-8 lg:p-10" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-5 w-40 rounded-full" />
      <Skeleton className="mt-5 h-[1.875rem] w-64 max-w-full rounded-full sm:h-9" />
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <div className={`h-[480px] p-5 ${CARTE}`}>
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="mt-6 h-12 rounded-[14px]" />
          <Skeleton className="mt-3 h-12 rounded-[14px]" />
          <Skeleton className="mt-3 h-12 rounded-[14px]" />
        </div>
        <Skeleton className="hidden aspect-[210/297] rounded-[20px] xl:block" />
      </div>
    </div>
  );
}
