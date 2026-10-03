"use client";

import { createClient } from "@/lib/supabase/client";
import { marquerNoteTerminee } from "@/lib/notes";
import { changerStatutEvenement } from "@/components/planning/actionsEvenement";
import { LigneAccueil } from "./Blocs";
import { BlocAvecTrace, FinCoche, FinMot, useTraceAccueil } from "./TraceAccueil";

// ============================================================
// « Aujourd'hui » (26/09, lot B) — une seule liste, triée par heure.
//
// Refonte (03/10 — duel C, lot 4) : c'est « devant ». Seulement ce dont
// l'heure n'est pas passée : un rendez-vous, une tâche, une note avec
// rappel. Un rendez-vous fini depuis moins d'une heure y reste, en tête ;
// au-delà, il passe dans « À régler ». Ce qui est passé (notes en retard
// comprises) vit dans « À régler », jamais aux deux endroits.
// Les notes ET les tâches se cochent sur la ligne ; « Annuler » les remet
// à faire (les mêmes écritures que la fiche et le planning).
// ============================================================

export type ElementJour = {
  cle: string;
  genre: "note" | "rdv" | "tache";
  /** L'identifiant de la note ou de l'événement. */
  id: string;
  date: string;
  principal: string;
  secondaire?: string;
  href: string;
};

const HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

export function ListeAujourdhui({ elements }: { elements: ElementJour[] }) {
  const supabase = createClient();
  const { masques, erreurs, enCours, faire } = useTraceAccueil();
  const visibles = elements.filter((e) => !masques.has(e.cle));

  function cocher(e: ElementJour) {
    const estNote = e.genre === "note";
    void faire({
      bloc: "aujourdhui",
      cle: e.cle,
      texte: `Fait : ${e.principal}`,
      ecrire: () => (estNote ? marquerNoteTerminee(supabase, e.id, true) : changerStatutEvenement(supabase, e.id, "termine")),
      annuler: () => (estNote ? marquerNoteTerminee(supabase, e.id, false) : changerStatutEvenement(supabase, e.id, "a_faire")),
    });
  }

  return (
    <BlocAvecTrace
      bloc="aujourdhui"
      titre="Aujourd'hui"
      lienTous="/dashboard/planning"
      lignes={visibles.map((e) => {
        const reessayer = erreurs.get(e.cle);
        const cochable = e.genre !== "rdv";
        return (
          <LigneAccueil
            key={e.cle}
            href={e.href}
            repere={HEURE.format(new Date(e.date)).replace(":", "h")}
            principal={e.principal}
            secondaire={e.secondaire}
            alerte={reessayer ? "Pas enregistré" : undefined}
            fin={
              reessayer ? (
                <FinMot libelle="Réessayer" surClic={reessayer} occupe={enCours !== null} />
              ) : cochable ? (
                <FinCoche libelle={e.principal} surFait={() => cocher(e)} occupe={enCours !== null} />
              ) : undefined
            }
          />
        );
      })}
    />
  );
}
