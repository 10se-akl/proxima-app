import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvenementPlanning, Priorite, StatutEvenement, TypeChantier } from "@/types";

// ============================================================
// Ce qui est commun à la grille (ordinateur) et à l'agenda (téléphone) du
// planning (27/09) : le type d'un événement avec son projet, les trois
// actions qui le modifient, et les petites fonctions de date.
// ============================================================

export type EvenementAvecProjet = EvenementPlanning & {
  demandes?: {
    nom_client?: string;
    priorite?: Priorite;
    type_chantier?: TypeChantier;
    telephone_client?: string | null;
    adresse_client?: string | null;
  } | null;
};

/** Fait / à faire / annulé. Vrai si la ligne a bien été modifiée. */
export async function changerStatutEvenement(
  supabase: SupabaseClient,
  id: string,
  statut: StatutEvenement
): Promise<boolean> {
  const { data, error } = await supabase.from("evenements_planning").update({ statut }).eq("id", id).select("id");
  return !error && !!data && data.length > 0;
}

export async function supprimerEvenement(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await supabase.from("evenements_planning").delete().eq("id", id).select("id");
  return !error && !!data && data.length > 0;
}

export function estMemeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Clé locale (pas toISOString, qui bascule en UTC et peut décaler le jour
// pour un événement en soirée) — doit correspondre au format des dates
// renvoyées par l'API météo Open-Meteo ("AAAA-MM-JJ").
export function cleDateLocale(date: Date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}
