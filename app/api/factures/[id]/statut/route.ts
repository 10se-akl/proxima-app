import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";

// Ne touche jamais lignes/montants/mentions_legales — uniquement le statut
// (émise → payée). Voir le commentaire sur la policy RLS "update" de la
// table factures (supabase/schema.sql) : la base empêche déjà toute
// modification d'une facture annulée, cette route referme l'autre moitié
// de la règle (jamais de body autre que "statut" accepté ici).
const STATUTS_AUTORISES = ["payee"] as const;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let corps: { statut?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (!corps.statut || !STATUTS_AUTORISES.includes(corps.statut as (typeof STATUTS_AUTORISES)[number])) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

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

  const { data: facture, error } = await supabase
    .from("factures")
    // payee_le (08/09) — distinct de date_emission, voir types/index.ts :
    // sans cette date, le bilan mensuel n'aurait aucun moyen de savoir
    // QUAND l'argent a réellement été encaissé.
    .update({ statut: corps.statut, payee_le: new Date().toISOString() })
    .eq("id", params.id)
    .eq("organisation_id", organisationId)
    .eq("statut", "emise") // seule une facture encore "émise" peut passer "payée"
    .select()
    .single();

  if (error || !facture) {
    return NextResponse.json({ error: "Impossible de mettre à jour cette facture" }, { status: 404 });
  }

  await enregistrerEvenement(supabase, {
    demandeId: facture.demande_id,
    artisanId: user.id,
    organisationId,
    type: "facture_payee",
    titre: `Facture n° ${facture.numero} marquée comme payée`,
    detail: `${Number(facture.total_ttc).toFixed(2)} € TTC`,
  });

  return NextResponse.json({ facture });
}
