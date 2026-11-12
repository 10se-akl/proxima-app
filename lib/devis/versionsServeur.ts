import type { SupabaseClient } from "@supabase/supabase-js";
import { autreVersionSignee, estRemplace, type VersionDevis } from "@/lib/devis/versions";

// ============================================================
// Versions d'un devis vues depuis la page publique (12/11). Le lien du
// client ne donne accès qu'à SON devis : pour savoir si une version plus
// récente lui a été envoyée, il faut lire les autres devis du même projet,
// donc la clé serveur. Seules les dates et les statuts sont lus, et seuls
// deux booléens sortent d'ici : rien des autres devis n'arrive chez le
// client.
// ============================================================

export async function etatDesVersions(
  admin: SupabaseClient,
  devisId: string
): Promise<{ remplace: boolean; autreVersionSignee: boolean }> {
  const rien = { remplace: false, autreVersionSignee: false };
  const { data: ceDevis } = await admin
    .from("devis")
    .select("id, demande_id, statut, created_at, envoye_le, signe_le")
    .eq("id", devisId)
    .maybeSingle();
  if (!ceDevis) return rien;
  const { data: versions } = await admin
    .from("devis")
    .select("id, statut, created_at, envoye_le, signe_le")
    .eq("demande_id", ceDevis.demande_id);
  const autres = (versions ?? []) as VersionDevis[];
  return {
    remplace: estRemplace(ceDevis as VersionDevis, autres),
    autreVersionSignee: autreVersionSignee(ceDevis as VersionDevis, autres) !== null,
  };
}
