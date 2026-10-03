"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import { VueParametres } from "@/components/parametres/VueParametres";
import { EtatErreur } from "@/components/ui/EtatErreur";
import type { FormulaireParametres } from "@/lib/parametres";
import { SquelettePage } from "@/components/ui/Skeleton";

// Paramètres — le chargement ; l'écran est dans
// components/parametres/VueParametres.tsx (26/09, lot F).
//
// 27/09 — Deux défauts corrigés, comme sur la page Notes (Sprint
// Robustesse, 30/08) :
//   - une session expirée laissait « Chargement… » pour toujours ;
//   - une lecture en échec (réseau coupé) affichait les valeurs par
//     défaut comme si c'étaient les siennes : « Enregistrer » aurait
//     alors écrasé les vrais paramètres de l'artisan.
// Dans les deux cas : un message et « Réessayer ».
export default function ParametresPage() {
  const [etat, setEtat] = useState<{
    form: FormulaireParametres | null;
    organisationId: string | null;
    estProprietaire: boolean;
    nomProprietaire: string | null;
  } | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    const supabase = createClient();
    setErreur(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErreur(true);
        return;
      }

      // Les paramètres d'entreprise sont partagés par toute l'équipe (une
      // seule ligne par organisation, pas par personne) — voir Module 14
      // dans supabase/schema.sql.
      const { data: membership, error: erreurMembre } = await supabase
        .from("memberships")
        .select("organisation_id, role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (erreurMembre) {
        setErreur(true);
        return;
      }

      if (!membership) {
        setEtat({ form: null, organisationId: null, estProprietaire: false, nomProprietaire: null });
        return;
      }

      // Refonte (03/10, duel A) — seul le propriétaire change un IBAN ou un
      // BIC déjà saisi (la base le refuse aux autres, Module 52). Pour les
      // autres, l'écran montre ces deux valeurs en lecture seule et dit qui
      // peut les changer, par son nom : aucun mot de rôle n'est affiché.
      const estProprietaire = membership.role === "proprietaire";
      let nomProprietaire: string | null = null;
      if (!estProprietaire) {
        const { data: proprietaire } = await supabase
          .from("memberships")
          .select("user_id")
          .eq("organisation_id", membership.organisation_id)
          .eq("role", "proprietaire")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (proprietaire) {
          const { data: profil } = await supabase.from("profils").select("nom").eq("id", proprietaire.user_id).maybeSingle();
          nomProprietaire = profil?.nom?.trim() || null;
        }
      }

      const { data, error } = await supabase
        .from("parametres_entreprise")
        .select("*")
        .eq("organisation_id", membership.organisation_id)
        .maybeSingle();
      if (error) {
        setErreur(true);
        return;
      }

      // Fusion plutôt que remplacement : un réglage ajouté récemment et
      // encore absent de la ligne enregistrée prend sa valeur par défaut
      // au lieu de rester vide (et de bloquer l'enregistrement s'il est
      // obligatoire, comme la validité des devis).
      setEtat({
        form: data ? { ...PARAMETRES_PAR_DEFAUT, ...(data as Partial<FormulaireParametres>) } : null,
        organisationId: membership.organisation_id,
        estProprietaire,
        nomProprietaire,
      });
    } catch {
      setErreur(true);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  if (erreur) {
    return <EtatErreur onReessayer={charger} className="px-4 pt-5 pb-8 sm:p-8" />;
  }
  if (!etat) {
    return <SquelettePage />;
  }
  return (
    <VueParametres
      initial={etat.form}
      organisationId={etat.organisationId}
      estProprietaire={etat.estProprietaire}
      nomProprietaire={etat.nomProprietaire}
    />
  );
}
