"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
            ? "Urgence détectée par l'IA lors de l'analyse — mode auto activé à votre demande."
            : "Urgence détectée par l'IA lors de l'analyse, confirmée par vous.",
      });
      if (reponse === "auto") {
        await supabase.from("profils").update({ urgence_auto_ia: true }).eq("id", artisanId);
      }
    }

    setEnCours(false);
    onTraite();
  }

  return (
    <Card className="mt-3 p-4 border-signal/30">
      <p className="text-xs font-medium text-signal uppercase tracking-wider mb-2">
        Urgence détectée
      </p>
      <p className="text-sm text-ink/80">
        Vos notes laissent penser que ce chantier doit être traité en priorité. Voulez-vous passer ce
        projet en urgent ?
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-3">
          <Button onClick={() => repondre("oui")} disabled={enCours}>
            Oui, passer en urgent
          </Button>
          <Button variant="ghost" onClick={() => repondre("non")} disabled={enCours}>
            Non
          </Button>
        </div>
        <button
          onClick={() => repondre("auto")}
          disabled={enCours}
          className="text-left text-xs text-ink/50 hover:text-ink underline transition-colors disabled:opacity-50"
        >
          Laisser l&apos;IA faire ce choix seule la prochaine fois
        </button>
      </div>
    </Card>
  );
}
