"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reprendreProjet } from "@/lib/projetEnSommeil";
import { vibrer, vibrerEchec } from "@/lib/retour";

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
    <section aria-label="Projet rangé" className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] bg-paper-warm px-4 py-3">
      <p className="min-w-0 flex-1 text-base text-ink">
        <span className="font-semibold">Projet rangé</span>
        <span className="text-steel"> le {JOUR.format(new Date(depuis))} : il n&apos;apparaît plus sur l&apos;accueil.</span>
        <span role="alert" className="block text-sm font-semibold text-signal-fonce empty:hidden dark:text-signal-clair">
          {echec ? "Pas enregistré. Réessayez." : ""}
        </span>
      </p>
      <button
        type="button"
        onClick={() => void reprendre()}
        disabled={enCours}
        className="inline-flex min-h-12 shrink-0 items-center rounded-2xl bg-ink px-4 text-base font-semibold text-paper active:scale-[0.97] disabled:opacity-60 motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        Reprendre le projet
      </button>
    </section>
  );
}
