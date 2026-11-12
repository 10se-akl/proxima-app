import { createAdminClient } from "@/lib/supabase/admin";
import { PLACES_BETA } from "@/lib/candidatures/places-constante";

export { PLACES_BETA };

// ============================================================
// Les places de la bêta (12/11, décision d'Axel : « jusqu'à 20 comptes »).
//
// Tant qu'il reste des places, un artisan qui s'inscrit entre tout de
// suite dans Compyo. Au-delà, son compte est créé « en attente » : c'est la
// liste d'attente, et Axel ouvre lui-même les comptes suivants depuis
// /admin/candidatures quand il peut les suivre.
//
// Une place = une inscription dont le compte a été ouvert (candidature
// « accepted »), qu'elle l'ait été automatiquement ou par Axel. Pour
// ouvrir plus de places, changer PLACES_BETA (lib/candidatures/places-constante.ts).
// ============================================================

/** Vrai s'il reste au moins une place. Une lecture impossible compte comme
 *  « complet » : le compte part en liste d'attente, Axel est prévenu par
 *  e-mail et l'ouvre à la main ; mieux que dépasser la limite sans le voir. */
export async function resteDesPlaces(admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const { count, error } = await admin
    .from("candidatures")
    .select("id", { count: "exact", head: true })
    .eq("statut", "accepted");
  if (error) {
    console.error("Places de la bêta : comptage impossible —", error.message);
    return false;
  }
  return (count ?? 0) < PLACES_BETA;
}
