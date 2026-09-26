"use client";

import { IconePlus } from "@/components/projet/icones";

// Les états vides invitent à capturer, par la même porte que le [+] de la
// navigation (components/dashboard/Sidebar.tsx) : il n'en existe qu'une.
export function BoutonCapture({ libelle = "Nouveau projet" }: { libelle?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("compyo:ouvrir-capture"))}
      className="inline-flex min-h-12 items-center gap-2 rounded-full bg-signal px-6 text-[15px] font-semibold text-white transition motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <IconePlus className="h-5 w-5" />
      {libelle}
    </button>
  );
}
