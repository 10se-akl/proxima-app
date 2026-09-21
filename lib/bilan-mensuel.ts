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

// Le temps gagné, seul : utilisé par le bilan envoyé par email ET par la
// page d'activité (app/dashboard/bilan/page.tsx), qui calcule le reste de
// son côté (voir lib/activite.ts).
export async function estimerTempsGagne(
  supabase: SupabaseClient,
  organisationId: string,
  debut: Date,
  fin: Date
): Promise<{ heuresGagnees: number; detailHeures: DetailHeures[] }> {
  const debutISO = debut.toISOString();
  const finISO = fin.toISOString();

  const [{ count: notesVocalesCount }, { count: importsCount }, { data: logsDevisGenere }] =
    await Promise.all([
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
      supabase
        .from("logs")
        .select("details")
        .eq("organisation_id", organisationId)
        .eq("type", "devis_genere")
        .gte("created_at", debutISO)
        .lt("created_at", finISO),
    ]);

  const devisGeneresIA = (logsDevisGenere ?? []).filter((l) => {
    const details = l.details as { action?: string } | null;
    return !details?.action;
  }).length;
  const notesVocales = notesVocalesCount ?? 0;
  const imports = importsCount ?? 0;

  const detailHeures: DetailHeures[] = [
    { libelle: "Devis générés par l'IA", occurrences: devisGeneresIA, minutes: devisGeneresIA * MIN_PAR_DEVIS_IA },
    { libelle: "Notes vocales transcrites", occurrences: notesVocales, minutes: notesVocales * MIN_PAR_NOTE_VOCALE },
    {
      libelle: "Imports automatiques (messages, captures d'écran)",
      occurrences: imports,
      minutes: imports * MIN_PAR_IMPORT,
    },
  ].filter((d) => d.occurrences > 0);

  const totalMinutes = detailHeures.reduce((s, d) => s + d.minutes, 0);
  return { heuresGagnees: Math.round((totalMinutes / 60) * 10) / 10, detailHeures };
}

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
    temps,
  ] = await Promise.all([
    // Audit (11/09) — 🟠 ce filtre excluait les acomptes payés : un acompte
    // marqué "payée" est pourtant de l'argent réellement encaissé (voir
    // FacturesProjet.tsx, "Marquer payée" n'est proposé que pour type
    // facture/acompte, jamais pour un avoir — filtrer par statut suffit
    // déjà, ".neq avoir" reste une défense en profondeur explicite plutôt
    // qu'implicite). Un acompte encaissé en cours de mois sans facture de
    // solde émise ce même mois affichait "Montant encaissé : 0,00 €",
    // contredisant le texte affiché à l'écran (bilan/page.tsx : "correspond
    // aux factures que vous avez marquées comme payées").
    supabase
      .from("factures")
      .select("total_ttc")
      .eq("organisation_id", organisationId)
      .neq("type", "avoir")
      .eq("statut", "payee")
      .gte("payee_le", debutISO)
      .lt("payee_le", finISO),
    supabase
      .from("devis")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .gte("envoye_le", debutISO)
      .lt("envoye_le", finISO),
    // 21/09 — Compté sur demandes.accepte_le, plus sur les événements de
    // timeline. Les deux chemins d'acceptation (bouton "Marquer accepté"
    // et signature en ligne) écrivent cette date dans la même écriture
    // que le statut du projet ; l'événement, lui, était écrit à part, et
    // son échec passait inaperçu (voir lib/timeline.ts) — un devis bien
    // accepté pouvait donc manquer au bilan.
    supabase
      .from("demandes")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .gte("accepte_le", debutISO)
      .lt("accepte_le", finISO),
    estimerTempsGagne(supabase, organisationId, debut, fin),
  ]);

  const montantEncaisse = (facturesPayees ?? []).reduce(
    (somme, f) => somme + Number(f.total_ttc),
    0
  );

  return {
    debut: debutISO,
    fin: finISO,
    montantEncaisse: Math.round(montantEncaisse * 100) / 100,
    devisEnvoyes: devisEnvoyesCount ?? 0,
    devisAcceptes: devisAcceptesCount ?? 0,
    heuresGagnees: temps.heuresGagnees,
    detailHeures: temps.detailHeures,
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
