import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Bilan mensuel (08/09) — architecture revue avant tout code : voir
// docs/idees-futures.md pour le raisonnement complet (pourquoi ces 3
// chiffres, pourquoi un ton neutre, pourquoi email + page plutôt qu'une
// notification push). Trois chiffres seulement, tous vérifiables à partir
// de données déjà en base — jamais une estimation présentée comme un fait.
//
// Montant encaissé : basé sur payee_le (date de PAIEMENT réel), jamais
// date_emission — une facture émise fin de mois peut être payée le mois
// suivant, utiliser date_emission donnerait un chiffre faux.
//
// "Heures gagnées" : décomposé et affiché avec sa méthode (voir
// detailHeures), jamais un chiffre nu — c'est ce qui évite l'effet
// publicitaire ("regardez comme on est utiles !") au profit d'un relevé
// factuel que l'artisan peut vérifier lui-même.
// ============================================================

export type DetailHeures = {
  libelle: string;
  occurrences: number;
  minutes: number;
};

export type BilanMensuel = {
  debut: string;
  fin: string;
  montantEncaisse: number;
  devisEnvoyes: number;
  devisAcceptes: number;
  heuresGagnees: number;
  detailHeures: DetailHeures[];
};

// Coefficients temps volontairement conservateurs (voir discussion sur
// l'estimation initiale de gain de temps) — mieux vaut sous-estimer que
// promettre un chiffre qui ne résiste pas à la remise en question.
const MIN_PAR_NOTE_VOCALE = 3;
const MIN_PAR_DEVIS_IA = 15;
const MIN_PAR_IMPORT = 2;

export async function calculerBilanMensuel(
  supabase: SupabaseClient,
  organisationId: string,
  debut: Date,
  fin: Date
): Promise<BilanMensuel> {
  const debutISO = debut.toISOString();
  const finISO = fin.toISOString();

  const [
    { data: facturesPayees },
    { count: devisEnvoyesCount },
    { count: devisAcceptesCount },
    { count: notesVocalesCount },
    { count: importsCount },
    { data: logsDevisGenere },
  ] = await Promise.all([
    supabase
      .from("factures")
      .select("total_ttc")
      .eq("organisation_id", organisationId)
      .eq("type", "facture")
      .eq("statut", "payee")
      .gte("payee_le", debutISO)
      .lt("payee_le", finISO),
    supabase
      .from("devis")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .gte("envoye_le", debutISO)
      .lt("envoye_le", finISO),
    // "devis_accepte" (evenements_projet) couvre à la fois l'acceptation
    // manuelle ("Marquer comme accepté") et la signature électronique en
    // ligne (voir Module 31) — un seul type d'événement, une seule requête.
    supabase
      .from("evenements_projet")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("type", "devis_accepte")
      .gte("created_at", debutISO)
      .lt("created_at", finISO),
    supabase
      .from("evenements_projet")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("type", "note_vocale_ajoutee")
      .gte("created_at", debutISO)
      .lt("created_at", finISO),
    supabase
      .from("evenements_projet")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("type", "message_importe")
      .gte("created_at", debutISO)
      .lt("created_at", finISO),
    // "logs" (pas evenements_projet) pour distinguer un devis réellement
    // généré par l'IA d'un devis express ou dupliqué — voir
    // app/api/devis/creer-vide/route.ts et app/api/devis/dupliquer/
    // route.ts, qui marquent explicitement details.action dans ce cas.
    // evenements_projet, lui, utilise le même type "devis_genere" pour les
    // trois cas, sans distinction possible.
    supabase
      .from("logs")
      .select("details")
      .eq("organisation_id", organisationId)
      .eq("type", "devis_genere")
      .gte("created_at", debutISO)
      .lt("created_at", finISO),
  ]);

  const montantEncaisse = (facturesPayees ?? []).reduce(
    (somme, f) => somme + Number(f.total_ttc),
    0
  );

  const devisGeneresIA = (logsDevisGenere ?? []).filter((l) => {
    const details = l.details as { action?: string } | null;
    return !details?.action;
  }).length;

  const notesVocales = notesVocalesCount ?? 0;
  const imports = importsCount ?? 0;

  const detailHeures: DetailHeures[] = [
    {
      libelle: "Devis générés par l'IA",
      occurrences: devisGeneresIA,
      minutes: devisGeneresIA * MIN_PAR_DEVIS_IA,
    },
    {
      libelle: "Notes vocales transcrites",
      occurrences: notesVocales,
      minutes: notesVocales * MIN_PAR_NOTE_VOCALE,
    },
    {
      libelle: "Imports automatiques (messages, captures d'écran)",
      occurrences: imports,
      minutes: imports * MIN_PAR_IMPORT,
    },
  ].filter((d) => d.occurrences > 0);

  const totalMinutes = detailHeures.reduce((s, d) => s + d.minutes, 0);

  return {
    debut: debutISO,
    fin: finISO,
    montantEncaisse: Math.round(montantEncaisse * 100) / 100,
    devisEnvoyes: devisEnvoyesCount ?? 0,
    devisAcceptes: devisAcceptesCount ?? 0,
    heuresGagnees: Math.round((totalMinutes / 60) * 10) / 10,
    detailHeures,
  };
}

// Un bilan où tout est à zéro n'a rien à montrer ni à envoyer par email —
// éviter le bruit pour une organisation inactive ce mois-là.
export function bilanEstVide(bilan: BilanMensuel): boolean {
  return (
    bilan.montantEncaisse === 0 &&
    bilan.devisEnvoyes === 0 &&
    bilan.devisAcceptes === 0 &&
    bilan.heuresGagnees === 0
  );
}
