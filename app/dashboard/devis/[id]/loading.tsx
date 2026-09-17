import { Skeleton } from "@/components/ui/Skeleton";

// Sans ce fichier, c'est le squelette de la LISTE des devis
// (app/dashboard/devis/loading.tsx) qui s'afficherait en ouvrant un devis.
export default function Chargement() {
  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-64" />
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-[480px]" />
        <Skeleton className="hidden aspect-[210/297] lg:block" />
      </div>
    </div>
  );
}
