import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import { genererLignesAvoir, calculerTotauxFacture, formaterNumeroFacture } from "@/lib/moteur-metier/genererFacture";
import type { Facture } from "@/types";

// ============================================================
// Annule une facture émise en créant un avoir — jamais en supprimant ou en
// modifiant la facture d'origine (voir la policy RLS "update" de
// factures : une facture émise ne peut plus changer de contenu, seulement
// de statut). L'avoir reprend exactement les lignes de la facture
// annulée, montants inversés (voir genererLignesAvoir), et consomme lui
// aussi un numéro dans la même séquence continue — jamais de trou.
//
// Volontairement un avoir "pleine annulation" uniquement (100% du montant),
// pas d'avoir partiel dans cette première version — couvre le cas réel le
// plus fréquent (erreur de saisie, chantier annulé) sans complexifier la
// saisie pour l'artisan.
//
// Audit pré-bêta (09/09), points 🟠 n°9 et n°10 — l'insertion de l'avoir
// PUIS la mise à jour du statut de la facture d'origine se faisaient
// jusqu'ici en deux écritures séparées, non transactionnelles (et le
// résultat du second appel n'était même pas vérifié). Les deux checks
// ci-dessous restent ici pour un message d'erreur rapide et clair sans
// aller-retour DB inutile, mais l'atomicité réelle (et la protection
// contre une double annulation concurrente) vit désormais dans la
// fonction Postgres creer_avoir_et_annuler() — voir supabase/schema.sql,
// Module 34.
// ============================================================

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const organisationId = await getOrganisationId(supabase, user.id);
  if (!organisationId) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }

  const { data: factureOriginale, error: erreurLecture } = await supabase
    .from("factures")
    .select("*")
    .eq("id", params.id)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (erreurLecture || !factureOriginale) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }
  if (factureOriginale.statut === "annulee") {
    return NextResponse.json({ error: "Cette facture est déjà annulée" }, { status: 400 });
  }
  if (factureOriginale.type === "avoir") {
    return NextResponse.json({ error: "Un avoir ne peut pas lui-même être annulé par un avoir" }, { status: 400 });
  }

  // Audit (11/09) — 🟠 un acompte annulé APRÈS qu'une facture de solde l'a
  // déjà déduit (genererLignesFactureComplete) laissait cette facture de
  // solde afficher, de façon immuable (verrouillage à l'émission), une
  // ligne de déduction pour un acompte désormais annulé — deux documents
  // fiscaux finalisés mutuellement incohérents, sans qu'aucune facture de
  // solde correcte ne puisse être réémise tant que l'ancienne reste active.
  // On bloque ce cas à la racine plutôt que de tenter de réconcilier après
  // coup : annuler d'abord la facture de solde (elle redeviendra
  // réémettable, cette fois sans la déduction), ensuite seulement l'acompte.
  if (factureOriginale.type === "acompte") {
    const { data: soldeActif } = await supabase
      .from("factures")
      .select("id, numero")
      .eq("devis_id", factureOriginale.devis_id)
      .eq("type", "facture")
      .neq("statut", "annulee")
      .maybeSingle();
    if (soldeActif) {
      return NextResponse.json(
        {
          error: `Impossible d'annuler cet acompte : la facture de solde n° ${soldeActif.numero} l'a déjà déduit. Annulez d'abord cette facture de solde (avoir), puis réessayez.`,
        },
        { status: 409 }
      );
    }
  }

  const { lignes, tva_pct } = genererLignesAvoir(factureOriginale as Facture);
  const totaux = calculerTotauxFacture(lignes, tva_pct);

  const annee = new Date().getFullYear();
  const { data: numeroSequentiel, error: erreurNumero } = await supabase.rpc("prochain_numero_facture", {
    p_organisation_id: organisationId,
    p_annee: annee,
  });
  if (erreurNumero || typeof numeroSequentiel !== "number") {
    console.error(erreurNumero);
    return NextResponse.json({ error: "Impossible d'attribuer un numéro d'avoir" }, { status: 500 });
  }
  const numero = formaterNumeroFacture(annee, numeroSequentiel);

  // Pas de .single() ici : creer_avoir_et_annuler() renvoie un seul "row
  // type" (factures), pas un ensemble — même convention que
  // prochain_numero_facture ci-dessus (retour scalaire direct, déjà un
  // objet unique côté PostgREST, jamais un tableau à désenvelopper).
  const { data: avoir, error: erreurTransaction } = await supabase.rpc("creer_avoir_et_annuler", {
    p_facture_id: factureOriginale.id,
    p_organisation_id: organisationId,
    p_artisan_id: user.id,
    p_numero: numero,
    p_lignes: lignes,
    p_sous_total_ht: totaux.sous_total_ht,
    p_tva_pct: tva_pct,
    p_montant_tva: totaux.montant_tva,
    p_total_ttc: totaux.total_ttc,
  });

  if (erreurTransaction || !avoir) {
    console.error(erreurTransaction);
    return NextResponse.json({ error: "Avoir non enregistré. Réessayez." }, { status: 500 });
  }

  await enregistrerEvenement(supabase, {
    demandeId: factureOriginale.demande_id,
    artisanId: user.id,
    organisationId,
    type: "avoir_cree",
    titre: `Avoir n° ${numero} créé pour la facture n° ${factureOriginale.numero}`,
    detail: `${totaux.total_ttc.toFixed(2)} € TTC`,
  });

  return NextResponse.json({ avoir });
}
