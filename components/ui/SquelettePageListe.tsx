import { Skeleton, SqueletteGroupe, SqueletteTitre } from "@/components/ui/Skeleton";
import { CLASSE_PAGE_LARGE } from "@/components/ui/EnTetePage";

// Squelette partagé par les pages "liste" du dashboard (projets, devis,
// factures) — voir components/ui/Skeleton.tsx pour le raisonnement
// d'ensemble.
//
// Design v3 (24/10) : la forme exacte des listes v3 — la grille commune
// (CLASSE_PAGE_LARGE), le titre de 30 px et sa phrase, le champ de
// recherche (48 px, rayon 14), une rangée de pastilles de filtre, puis la
// carte de lignes (68 px). Les projets ont des vignettes photo de 56 px.
export function SquelettePageListe({ titre }: { titre: string }) {
  const projets = titre === "Projets";
  return (
    <div className={CLASSE_PAGE_LARGE} aria-busy="true" aria-label={`Chargement : ${titre}`}>
      <SqueletteTitre />
      <Skeleton className="mt-5 h-12 rounded-[14px]" />
      {!projets && (
        <div className="mt-3 flex gap-2 overflow-hidden">
          <Skeleton className="h-11 w-20 shrink-0 rounded-full" />
          <Skeleton className="h-11 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-11 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
        </div>
      )}
      <div className="mt-5">
        <SqueletteGroupe lignes={5} vignette={projets ? 56 : 40} />
      </div>
    </div>
  );
}
