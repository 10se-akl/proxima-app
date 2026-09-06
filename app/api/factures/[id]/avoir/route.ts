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

  const { data: avoir, error: erreurInsertion } = await supabase
    .from("factures")
    .insert({
      organisation_id: organisationId,
      demande_id: factureOriginale.demande_id,
      devis_id: factureOriginale.devis_id,
      client_id: factureOriginale.client_id,
      artisan_id: user.id,
      type: "avoir",
      numero,
      statut: "emise",
      lignes,
      sous_total_ht: totaux.sous_total_ht,
      tva_pct,
      montant_tva: totaux.montant_tva,
      total_ttc: totaux.total_ttc,
      facture_liee_id: factureOriginale.id,
      mentions_legales: factureOriginale.mentions_legales,
    })
    .select()
    .single();

  if (erreurInsertion || !avoir) {
    console.error(erreurInsertion);
    return NextResponse.json({ error: "Avoir non enregistré. Réessayez." }, { status: 500 });
  }

  // La facture d'origine passe "annulee" seulement une fois l'avoir bien
  // enregistré — jamais l'inverse, pour ne pas se retrouver avec une
  // facture marquée annulée sans qu'aucun avoir n'existe réellement.
  await supabase.from("factures").update({ statut: "annulee" }).eq("id", factureOriginale.id);

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
