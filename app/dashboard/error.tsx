"use client";

import { useEffect } from "react";
import { EtatErreur } from "@/components/ui/EtatErreur";
import { CLASSE_PAGE_ETROITE } from "@/components/ui/EnTetePage";
import { CARTE } from "@/components/ui/recettes";

// Refonte (02/10) — règle 13 de docs/langage-interface.md. Sans ce
// fichier, une erreur pendant le rendu d'un écran du tableau de bord
// tombait sur la page d'erreur générique de Next : plus de barre de
// navigation, aucun moyen de réessayer. Ici, la barre reste (le layout
// n'est pas touché) et « Réessayer » relance seulement l'écran.
// Design v3 (24/10) : dans la grille commune, posé dans une carte calme.
export default function ErreurTableauDeBord({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={CLASSE_PAGE_ETROITE}>
      <div className={`${CARTE} mt-2`}>
        <EtatErreur message="Cet écran ne s'est pas chargé." onReessayer={reset} />
      </div>
      {/* 04/10 — le repère de l'erreur, à envoyer au support : il retrouve
          la trace exacte dans les journaux Vercel. */}
      {error.digest && <p className="mt-3 text-center text-[13px] text-steel">Code : {error.digest}</p>}
    </div>
  );
}
