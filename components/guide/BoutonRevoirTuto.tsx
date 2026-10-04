"use client";

import { CLASSE_BOUTON_NUIT } from "@/components/ui/EnTetePage";

// Relance le mini-tuto du premier lancement (components/onboarding/
// TutoPremierProjet.tsx), monté dans le tableau de bord. Posé sur l'en-tête
// bleu nuit du guide (04/10) : blanc, texte bleu nuit.
export function BoutonRevoirTuto() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("compyo:ouvrir-tuto"))}
      className={CLASSE_BOUTON_NUIT}
    >
      Refaire le tuto : créer un projet
    </button>
  );
}
