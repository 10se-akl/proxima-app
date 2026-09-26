"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import { VueParametres } from "@/components/parametres/VueParametres";
import type { FormulaireParametres } from "@/lib/parametres";

// Paramètres — le chargement ; l'écran est dans
// components/parametres/VueParametres.tsx (26/09, lot F).
export default function ParametresPage() {
  const [etat, setEtat] = useState<{ form: FormulaireParametres | null; organisationId: string | null } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function charger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Les paramètres d'entreprise sont partagés par toute l'équipe (une
      // seule ligne par organisation, pas par personne) — voir Module 14
      // dans supabase/schema.sql.
      const { data: membership } = await supabase
        .from("memberships")
        .select("organisation_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setEtat({ form: null, organisationId: null });
        return;
      }

      const { data } = await supabase
        .from("parametres_entreprise")
        .select("*")
        .eq("organisation_id", membership.organisation_id)
        .maybeSingle();

      // Fusion plutôt que remplacement : un réglage ajouté récemment et
      // encore absent de la ligne enregistrée prend sa valeur par défaut
      // au lieu de rester vide (et de bloquer l'enregistrement s'il est
      // obligatoire, comme la validité des devis).
      setEtat({
        form: data ? { ...PARAMETRES_PAR_DEFAUT, ...(data as Partial<FormulaireParametres>) } : null,
        organisationId: membership.organisation_id,
      });
    }
    charger();
  }, []);

  if (!etat) {
    return <div className="p-8 text-sm text-ink/50">Chargement…</div>;
  }
  return <VueParametres initial={etat.form} organisationId={etat.organisationId} />;
}
