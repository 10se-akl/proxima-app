import type { SupabaseClient } from "@supabase/supabase-js";
import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";
import { creneauParDefaut, type DernierRendezVous } from "./semaine";

// ============================================================
// Ce que « Planifier » propose avant que l'artisan ait touché à quoi que ce
// soit (refonte 03/10, duel G) : un titre, un jour, une heure, une durée.
// Partagé par le formulaire (?projetId=) et par la feuille « Planifier ».
// ============================================================

/** « Chantier Dupont · Salle de bain » : le client et le type du projet. */
export function titreParDefaut(nomClient: string, type?: string | null): string {
  const quoi = type ? LABEL_TYPE_CHANTIER[type] : "";
  return quoi ? `Chantier ${nomClient} · ${quoi}` : `Chantier ${nomClient}`;
}

/** Demain, à l'heure et pour la durée du dernier rendez-vous du projet,
 *  sinon 8 h pour 1 h. Une lecture qui échoue donne la valeur par défaut :
 *  ce n'est qu'une proposition, l'artisan la voit et la corrige. */
export async function chargerCreneauParDefaut(supabase: SupabaseClient, demandeId: string) {
  const { data } = await supabase
    .from("evenements_planning")
    .select("date_heure, duree_minutes")
    .eq("demande_id", demandeId)
    .eq("type", "rendez_vous")
    .neq("statut", "annule")
    .order("date_heure", { ascending: false })
    .limit(1)
    .maybeSingle();
  return creneauParDefaut(data as DernierRendezVous | null);
}
