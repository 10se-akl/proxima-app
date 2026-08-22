import type { SupabaseClient } from "@supabase/supabase-js";
import type { TypeEvenementProjet } from "@/types";

// Enregistre un événement dans la timeline d'un projet. Aucun calcul,
// aucun appel IA : un simple insert, déclenché depuis les actions que
// l'artisan effectue déjà (créer, compléter, marquer comme envoyé...).
//
// Comme pour enregistrerLog() (lib/logs.ts), un échec d'écriture ne doit
// jamais bloquer l'action principale : il est avalé silencieusement.
export async function enregistrerEvenement(
  supabase: SupabaseClient,
  params: {
    demandeId: string;
    artisanId: string;
    organisationId: string;
    type: TypeEvenementProjet;
    titre: string;
    detail?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("evenements_projet").insert({
      demande_id: params.demandeId,
      artisan_id: params.artisanId,
      organisation_id: params.organisationId,
      type: params.type,
      titre: params.titre,
      detail: params.detail ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("Échec de l'enregistrement de l'événement de timeline :", err);
  }
}
