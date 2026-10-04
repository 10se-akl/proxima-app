"use client";

import { useEffect } from "react";
import { EtatErreur } from "@/components/ui/EtatErreur";

// Refonte (02/10) — règle 13 de docs/langage-interface.md. Sans ce
// fichier, une erreur pendant le rendu d'un écran du tableau de bord
// tombait sur la page d'erreur générique de Next : plus de barre de
// navigation, aucun moyen de réessayer. Ici, la barre reste (le layout
// n'est pas touché) et « Réessayer » relance seulement l'écran.
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
    <div className="max-w-2xl px-4 pt-5 sm:p-8">
      <EtatErreur message="Cet écran ne s'est pas chargé." onReessayer={reset} />
      {/* 04/10 — le repère de l'erreur, à envoyer au support : il retrouve
          la trace exacte dans les journaux Vercel. */}
      {error.digest && <p className="mt-3 text-xs text-steel">Code : {error.digest}</p>}
    </div>
  );
}
