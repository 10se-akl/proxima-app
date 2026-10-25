"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { BOUTON_CONTOUR, BOUTON_TEXTE } from "@/components/projet/Blocs";

// ============================================================
// Proposition de passage en urgent (Module 38, supabase/schema.sql).
//
// Déplacé le 13/09 depuis components/dashboard/NotesVocales.tsx : la
// détection d'urgence se faisait à chaque note vocale dictée, donc un
// artisan qui dictait quatre comptes-rendus déclenchait quatre appels IA
// et pouvait voir la question posée quatre fois. Elle se fait désormais au
// moment où l'artisan demande explicitement l'analyse du projet — un seul
// appel, une seule question, avec en prime une IA qui a vu TOUTES les
// notes plutôt qu'une seule.
//
// La règle non négociable reste la même : l'IA propose, l'artisan valide.
// Le troisième choix ("laisser l'IA décider seule") ne bascule en mode
// automatique que sur cette action précise — interne, réversible, jamais
// visible du client, jamais liée à un prix — et le changement reste
// TOUJOURS tracé dans la timeline du projet, y compris en mode auto.
// ============================================================

export function PropositionUrgence({
  demandeId,
  artisanId,
  organisationId,
  onTraite,
}: {
  demandeId: string;
  artisanId: string;
  organisationId: string;
  onTraite: () => void;
}) {
  const supabase = createClient();
  const [enCours, setEnCours] = useState(false);

  async function repondre(reponse: "oui" | "non" | "auto") {
    if (reponse === "non") {
      onTraite();
      return;
    }
    setEnCours(true);

    const { error } = await supabase
      .from("demandes")
      .update({ priorite: "urgent" })
      .eq("id", demandeId);

    if (!error) {
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId,
        organisationId,
        type: "priorite_changee",
        titre: "Priorité changée : Urgent",
        detail:
          reponse === "auto"
            ? "Repéré dans vos notes — passé en urgent sans demander, à votre demande."
            : "Repéré dans vos notes, confirmé par vous.",
      });
      if (reponse === "auto") {
        await supabase.from("profils").update({ urgence_auto_ia: true }).eq("id", artisanId);
      }
    }

    setEnCours(false);
    onTraite();
  }

  return (
    // Design v3 (24/10) : filet commun, la phrase entière (plus coupée).
    <div className="mt-4 border-t border-gris-clair pt-3">
      <p className="flex items-start gap-2 text-base font-semibold text-ink">
        <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-alerte-orange" />
        <span>Ça a l&apos;air urgent, d&apos;après vos notes.</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => repondre("oui")} disabled={enCours} className={BOUTON_CONTOUR}>
          Passer en urgent
        </button>
        <button type="button" onClick={() => repondre("non")} disabled={enCours} className={BOUTON_TEXTE}>
          Non
        </button>
      </div>
      <button
        type="button"
        onClick={() => repondre("auto")}
        disabled={enCours}
        // 25/10 — un bouton texte des recettes (plus de lien souligné).
        className={`-ml-3 text-left ${BOUTON_TEXTE}`}
      >
        La prochaine fois, passer en urgent sans demander
      </button>
    </div>
  );
}
