"use client";

import { BOUTON_CREUX } from "@/components/ui/recettes";

// Relance le mini-tuto du premier lancement (components/onboarding/
// TutoPremierProjet.tsx), monté dans le tableau de bord. Design v3
// (24/10) : en creux — le guide se lit, il n'a pas d'action principale.
export function BoutonRevoirTuto() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("compyo:ouvrir-tuto"))}
      className={BOUTON_CREUX}
    >
      Refaire le tuto : créer un projet
    </button>
  );
}
