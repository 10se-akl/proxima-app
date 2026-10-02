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
): Promise<boolean> {
  // 21/09 — Le client Supabase ne lève JAMAIS d'exception quand la base
  // refuse une écriture : il renvoie { error }. Le try/catch seul ne
  // voyait donc rien, et un événement refusé (droits, contrainte, colonne
  // manquante après une migration non appliquée) disparaissait sans une
  // ligne dans les journaux — c'est ce qui pouvait faire manquer un devis
  // accepté au bilan mensuel. L'écriture reste non bloquante pour l'action
  // en cours, mais l'échec est maintenant visible dans les logs Vercel.
  try {
    const { error } = await supabase.from("evenements_projet").insert({
      demande_id: params.demandeId,
      artisan_id: params.artisanId,
      organisation_id: params.organisationId,
      type: params.type,
      titre: params.titre,
      detail: params.detail ?? null,
      metadata: params.metadata ?? null,
    });
    if (error) {
      console.error(
        `Événement de timeline "${params.type}" refusé par la base :`,
        error.message,
        error.details ?? ""
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("Échec de l'enregistrement de l'événement de timeline :", err);
    return false;
  }
}
