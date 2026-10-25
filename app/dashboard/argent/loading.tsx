import { Skeleton, SqueletteGroupe, SqueletteTitre } from "@/components/ui/Skeleton";
import { CLASSE_PAGE_ETROITE } from "@/components/ui/EnTetePage";
import { CARTE_PLEINE } from "@/components/ui/recettes";

// Squelette de la page Argent (refonte 03/10) : sa vraie forme vidée —
// le titre, le total, un bloc de lignes (règle 11 du langage).
// Design v3 (24/10) : la carte « À encaisser » et son gros chiffre, puis
// un titre de bloc et sa carte de lignes.
export default function ChargementArgent() {
  return (
    <div className={CLASSE_PAGE_ETROITE} aria-busy="true" aria-label="Chargement">
      <SqueletteTitre />
      <div className={`mt-6 ${CARTE_PLEINE}`}>
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="mt-3 h-9 w-44 rounded-full" />
        <Skeleton className="mt-5 h-4 w-36 rounded-full" />
      </div>
      <Skeleton className="mt-8 h-6 w-48 rounded-full" />
      <div className="mt-2.5">
        <SqueletteGroupe lignes={3} />
      </div>
    </div>
  );
}
