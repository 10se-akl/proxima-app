import type { SupabaseClient } from "@supabase/supabase-js";
import type { LigneDevisCalculee } from "@/types";

// ============================================================
// Postes fréquents (08/09) — alternative à une grosse bibliothèque de prix
// générique (30 000-80 000 postes chez la concurrence, hors de portée sans
// acheter une vraie base de données professionnelle) : au lieu de deviner
// un "prix de marché" moyen, Compyo réutilise directement les postes que
// CET artisan a déjà lui-même chiffrés — sa vraie façon de travailler, pas
// une moyenne nationale. Zéro appel IA, zéro inférence floue : un simple
// comptage des descriptions déjà utilisées dans ses devis récents.
//
// Marche dès le 2ème ou 3ème devis, contrairement à une "mémoire apprise"
// par IA qui aurait besoin de bien plus de volume pour être fiable (voir
// discussion sur la mémoire métier, écartée pour l'instant faute de
// données suffisantes en bêta privée).
// ============================================================

export type PosteFrequent = {
  description: string;
  categorie: LigneDevisCalculee["categorie"];
  unite: string;
  prix_unitaire: number;
  nb_utilisations: number;
};

const NB_DEVIS_ANALYSES = 40;
const MAX_POSTES_RETOURNES = 8;

export async function obtenirPostesFrequents(
  supabase: SupabaseClient,
  organisationId: string,
  demandeIdAExclure?: string
): Promise<PosteFrequent[]> {
  const { data, error } = await supabase
    .from("devis")
    .select("lignes, demande_id")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false })
    .limit(NB_DEVIS_ANALYSES);

  if (error || !data) return [];

  const compteur = new Map<string, PosteFrequent>();

  for (const devis of data) {
    // Exclut le devis en cours d'édition : ses propres lignes ne sont pas
    // encore un "historique", inutile de se suggérer soi-même.
    if (demandeIdAExclure && devis.demande_id === demandeIdAExclure) continue;

    for (const ligne of (devis.lignes as LigneDevisCalculee[] | null) ?? []) {
      if (!ligne?.description?.trim()) continue;
      const cle = ligne.description.trim().toLowerCase();
      const existant = compteur.get(cle);
      if (existant) {
        existant.nb_utilisations += 1;
      } else {
        compteur.set(cle, {
          description: ligne.description.trim(),
          categorie: ligne.categorie,
          unite: ligne.unite,
          prix_unitaire: ligne.prix_unitaire,
          nb_utilisations: 1,
        });
      }
    }
  }

  // Un poste utilisé une seule fois n'est pas encore une "habitude" —
  // autant ne pas encombrer la liste avec du bruit à faible valeur.
  return Array.from(compteur.values())
    .filter((p) => p.nb_utilisations >= 2)
    .sort((a, b) => b.nb_utilisations - a.nb_utilisations)
    .slice(0, MAX_POSTES_RETOURNES);
}
