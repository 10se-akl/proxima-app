import type { SupabaseClient } from "@supabase/supabase-js";

export type TypeLog =
  | "analyse_ia"
  | "devis_genere"
  | "reponse_generee"
  | "erreur_ia"
  | "resume_journee";

// Ne doit jamais faire planter l'action principale : un échec d'écriture
// de log est avalé silencieusement (juste tracé en console serveur).
export async function enregistrerLog(
  supabase: SupabaseClient,
  params: {
    artisanId: string;
    organisationId: string | null;
    type: TypeLog;
    contexte?: string;
    details?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("logs").insert({
      artisan_id: params.artisanId,
      organisation_id: params.organisationId,
      type: params.type,
      contexte: params.contexte ?? null,
      details: params.details ?? null,
    });
  } catch (err) {
    console.error("Échec de l'enregistrement du log :", err);
  }
}
