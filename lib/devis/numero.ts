import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Numéro du prochain devis (12/11), commun aux trois routes qui créent un
// devis (generer-devis, creer-vide, dupliquer).
//
// Avant : « nombre de devis créés cette année + 1 », l'année comptée sur
// created_at en UTC. Deux pièges :
// - un devis créé le 1er janvier entre minuit et 1 h (heure de Paris) est
//   encore « l'an dernier » en UTC : il prenait le n° 2027-001 sans être
//   compté dans 2027, le devis suivant recalculait 2027-001, heurtait la
//   contrainte d'unicité, et les 5 essais recalculaient le même numéro :
//   plus aucun devis possible de toute l'année ;
// - même blocage si un devis disparaissait un jour de la base.
// Maintenant : le plus grand numéro déjà pris pour l'année, + 1. Chaque
// nouvel essai relit, donc avance.
// ============================================================

export function numeroSuivant(numerosPris: (string | null)[], annee: number): string {
  const prefixe = `${annee}-`;
  let max = 0;
  for (const n of numerosPris) {
    if (!n || !n.startsWith(prefixe)) continue;
    const valeur = Number(n.slice(prefixe.length));
    if (Number.isInteger(valeur) && valeur > max) max = valeur;
  }
  return `${prefixe}${String(max + 1).padStart(3, "0")}`;
}

export async function prochainNumeroDevis(
  supabase: SupabaseClient,
  organisationId: string,
  annee: number
): Promise<string> {
  const { data } = await supabase
    .from("devis")
    .select("numero")
    .eq("organisation_id", organisationId)
    .like("numero", `${annee}-%`);
  return numeroSuivant(((data ?? []) as { numero: string | null }[]).map((d) => d.numero), annee);
}
