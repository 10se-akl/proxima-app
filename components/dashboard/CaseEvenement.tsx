"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EvenementPlanning } from "@/types";

export function CaseEvenement({ evenement }: { evenement: EvenementPlanning }) {
  const supabase = createClient();
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function basculer() {
    setEnCours(true);
    const nouveauStatut = evenement.statut === "termine" ? "a_faire" : "termine";
    await supabase
      .from("evenements_planning")
      .update({ statut: nouveauStatut })
      .eq("id", evenement.id);
    setEnCours(false);
    router.refresh();
  }

  return (
    <button
      onClick={basculer}
      disabled={enCours}
      className={`w-5 h-5 border shrink-0 flex items-center justify-center transition-colors ${
        evenement.statut === "termine"
          ? "bg-ink border-ink text-paper"
          : "border-ink/25 hover:border-ink"
      }`}
      aria-label="Marquer comme terminé"
    >
      {evenement.statut === "termine" && "✓"}
    </button>
  );
}
