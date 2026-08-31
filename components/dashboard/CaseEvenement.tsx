"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EvenementPlanning } from "@/types";

export function CaseEvenement({ evenement }: { evenement: EvenementPlanning }) {
  const supabase = createClient();
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  // Sprint Robustesse (30/08) — 🔴 même pattern que GrilleAgenda.tsx :
  // l'update n'était jamais vérifié. En cas d'échec (réseau, ou ligne
  // introuvable côté artisan à cause de la RLS), la case revenait à son
  // état d'origine après router.refresh() sans que l'artisan comprenne
  // pourquoi — il pouvait cliquer indéfiniment en pensant à un bug visuel.
  const [erreur, setErreur] = useState(false);

  async function basculer() {
    setEnCours(true);
    setErreur(false);
    // Sprint Robustesse (30/08) — repéré en revue de régression : sans ce
    // try/catch, une exception réseau brute laissait `enCours` bloqué à
    // true indéfiniment (bouton figé), au lieu de retomber sur le message
    // d'erreur ci-dessous.
    try {
      const nouveauStatut = evenement.statut === "termine" ? "a_faire" : "termine";
      // .select("id") permet de distinguer un vrai échec (error) d'un update
      // qui n'a touché aucune ligne (data vide) — ce second cas passerait
      // inaperçu sans lui, notamment si la RLS empêche silencieusement la
      // mise à jour de la ligne ciblée.
      const { data, error } = await supabase
        .from("evenements_planning")
        .update({ statut: nouveauStatut })
        .eq("id", evenement.id)
        .select("id");
      if (error || !data || data.length === 0) {
        setErreur(true);
        return;
      }
      router.refresh();
    } catch {
      setErreur(true);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={basculer}
        disabled={enCours}
        className={`w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-all duration-150 hover:scale-105 ${
          evenement.statut === "termine"
            ? "bg-ink border-ink text-paper"
            : "border-ink/25 hover:border-ink"
        }`}
        aria-label="Marquer comme terminé"
      >
        {evenement.statut === "termine" && "✓"}
      </button>
      {erreur && <p className="text-xs text-signal">Échec de l&apos;action. Réessayez.</p>}
    </div>
  );
}
