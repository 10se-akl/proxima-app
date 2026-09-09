import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";

// ============================================================
// Audit Cycle 2 (Agent Artisan terrain, point 🔴 critique) : un client qui
// change d'avis sur un devis déjà envoyé obligeait à "Marquer comme
// refusé" puis "Générer un nouveau devis" — qui relance l'IA depuis zéro
// et perd tout ajustement manuel précédent (lignes ajoutées, prix
// retouchés). Cette route duplique un devis existant TEL QUEL (mêmes
// lignes, déplacement, marge, TVA) dans un nouveau devis "brouillon",
// directement éditable dans ValiderDevis — sans repasser par l'IA.
// Volontairement déterministe (pas d'appel Claude) : ce n'est qu'une
// copie de données déjà connues, cohérent avec la consigne du fondateur
// de ne jamais faire appel à l'IA quand ce n'est pas nécessaire.
// ============================================================

export async function POST(request: NextRequest) {
  const { devisId } = await request.json();

  if (!devisId) {
    return NextResponse.json({ error: "devisId requis" }, { status: 400 });
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

  // RLS + filtre organisation_id explicite (défense en profondeur, même
  // discipline que le reste des routes serveur) : impossible de dupliquer
  // le devis d'une autre organisation.
  const { data: devisOriginal, error: erreurLecture } = await supabase
    .from("devis")
    .select("*")
    .eq("id", devisId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (erreurLecture || !devisOriginal) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }

  // Même logique de numérotation séquentielle par organisation/année, avec
  // retry sur conflit, que app/api/ai/generer-devis/route.ts — dupliquée
  // ici plutôt que factorisée pour l'instant : les deux routes divergent
  // sur ce qu'elles insèrent (postes calculés par l'IA vs copie directe),
  // seule la mécanique de numérotation est commune.
  const anneeCourante = new Date().getFullYear();
  const MAX_TENTATIVES_NUMERO = 5;
  const artisanId = user.id;

  async function inserer() {
    const { count: nbDevisCetteAnnee } = await supabase
      .from("devis")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .gte("created_at", `${anneeCourante}-01-01`)
      .lt("created_at", `${anneeCourante + 1}-01-01`);

    const numero = `${anneeCourante}-${String((nbDevisCetteAnnee ?? 0) + 1).padStart(3, "0")}`;

    return supabase
      .from("devis")
      .insert({
        demande_id: devisOriginal.demande_id,
        artisan_id: artisanId,
        organisation_id: organisationId,
        numero,
        lignes: devisOriginal.lignes,
        sous_total_ht: devisOriginal.sous_total_ht,
        deplacement: devisOriginal.deplacement,
        marge_pct: devisOriginal.marge_pct,
        tva_pct: devisOriginal.tva_pct,
        montant_tva: devisOriginal.montant_tva,
        total_estime: devisOriginal.total_estime,
        commentaires: devisOriginal.commentaires,
        statut: "brouillon",
        // Reprend l'état du devis d'origine plutôt que de le recalculer :
        // ce drapeau reflète les paramètres au moment où CE CONTENU a été
        // chiffré la première fois, une duplication ne rechiffre rien.
        parametres_configures: devisOriginal.parametres_configures,
      })
      .select()
      .single();
  }

  let devis: Awaited<ReturnType<typeof inserer>>["data"] = null;
  let insertError: Awaited<ReturnType<typeof inserer>>["error"] = null;

  for (let tentative = 1; tentative <= MAX_TENTATIVES_NUMERO; tentative++) {
    ({ data: devis, error: insertError } = await inserer());
    if (!insertError || insertError.code !== "23505") break;
  }

  if (insertError || !devis) {
    return NextResponse.json({ error: "Impossible de dupliquer ce devis" }, { status: 500 });
  }

  await enregistrerLog(supabase, {
    artisanId: user.id,
    organisationId,
    type: "devis_genere",
    contexte: devisOriginal.demande_id,
    details: { action: "duplication", depuis_devis: devisId },
  });

  return NextResponse.json({ devis });
}
