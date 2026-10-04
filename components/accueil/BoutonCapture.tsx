"use client";

import { IconePlus } from "@/components/projet/icones";

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
      className={`inline-flex min-h-14 items-center gap-2 rounded-2xl px-5 text-base font-semibold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        surNuit
          ? "bg-white text-nuit active:bg-white/80 focus-visible:ring-white focus-visible:ring-offset-nuit"
          : "bg-ink text-paper active:bg-ink/80 focus-visible:ring-ink focus-visible:ring-offset-paper"
      }`}
    >
      <IconePlus className="h-5 w-5" />
      {libelle}
    </button>
  );
}
