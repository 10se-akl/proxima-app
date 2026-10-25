"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reprendreProjet } from "@/lib/projetEnSommeil";
import { vibrer, vibrerEchec } from "@/lib/retour";
import { BOUTON_CREUX, CARTE, ERREUR } from "@/components/ui/recettes";

// ============================================================
// Un projet classé depuis l'accueil (« ça dort » → Classer, 23/10) : sa
// fiche le dit, et se reprend d'un geste. Repris, il revient sur l'accueil
// (À suivre, Mes projets) ; rien n'a été effacé entre-temps.
// ============================================================

const JOUR = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });

export function BandeauClasse({ projetId, depuis, surRepris }: { projetId: string; depuis: string; surRepris?: () => void }) {
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState(false);

  async function reprendre() {
    setEnCours(true);
    setEchec(false);
    const ok = await reprendreProjet(createClient(), projetId).catch(() => false);
    setEnCours(false);
    if (!ok) {
      vibrerEchec();
      setEchec(true);
      return;
    }
    vibrer();
    surRepris?.();
  }

  return (
    // Design v3 (24/10) : une carte, et « Reprendre » en creux — le bouton
    // plein de l'écran reste celui de « Maintenant ».
    <section aria-label="Projet rangé" className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 ${CARTE}`}>
      <p className="min-w-0 flex-1 text-base text-ink">
        <span className="font-semibold">Projet rangé</span>
        <span className="text-steel"> le {JOUR.format(new Date(depuis))} : il n&apos;apparaît plus sur l&apos;accueil.</span>
        <span role="alert" className={`${ERREUR} empty:hidden`}>
          {echec ? "Pas enregistré. Réessayez." : ""}
        </span>
      </p>
      <button type="button" onClick={() => void reprendre()} disabled={enCours} className={`${BOUTON_CREUX} shrink-0`}>
        Reprendre le projet
      </button>
    </section>
  );
}
