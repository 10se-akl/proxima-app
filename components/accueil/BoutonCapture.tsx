"use client";

import { IconePlus } from "@/components/projet/icones";
import { BOUTON_PLEIN } from "@/components/ui/recettes";

// Les états vides invitent à capturer, par la même porte que le [+] de la
// navigation (components/dashboard/Sidebar.tsx) : il n'en existe qu'une.
export function BoutonCapture({ libelle = "Nouveau projet", surNuit = false }: { libelle?: string; surNuit?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("compyo:ouvrir-capture"))}
      // Refonte (03/10) — règles 5 et 9 : le plein est en encre ; le
      // terracotta plein reste au seul « + » de la barre du bas.
      // 04/10 — posé sur l'en-tête bleu nuit de l'accueil, il passe en
      // blanc : l'encre du mode clair y disparaîtrait.
      // 25/10 — la recette du bouton plein (pilule de 48 px) ; la variante
      // sur fond nuit garde la même forme.
      className={
        surNuit
          ? "inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-base font-semibold text-nuit active:bg-white/80 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-nuit"
          : BOUTON_PLEIN
      }
    >
      <IconePlus className="h-5 w-5" />
      {libelle}
    </button>
  );
}
