import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";

// ============================================================
// Sprint Beta Final (27/08) — décision d'Axel pour le cas "un seul projet
// ouvert trouvé" (point 2 du brief) : ZÉRO appel IA. Le message brut est
// ajouté tel quel comme note au projet existant, l'artisan le lit
// lui-même — même pattern déjà en production pour les captures d'écran
// rattachées à un projet existant (voir app/api/ai/confirmer-import-
// captures/route.ts). Ajustable après retours bêta si des artisans
// loupent une urgence dans ce cas précis (voir rapport de cycle).
// ============================================================

export async function POST(request: NextRequest) {
  let corps: { projetId?: string; partageId?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { projetId, partageId } = corps;
  if (!projetId || !partageId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
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

  const { data: partage } = await supabase
    .from("partages_entrants")
    .select("texte")
    .eq("id", partageId)
    .single();

  if (!partage?.texte) {
    return NextResponse.json({ error: "Message partagé introuvable" }, { status: 404 });
  }

  const { data: projetExistant, error: fetchError } = await supabase
    .from("demandes")
    .select("notes")
    .eq("id", projetId)
    .eq("organisation_id", organisationId)
    .single();

  if (fetchError || !projetExistant) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const noteAjoutee = `--- Message partagé ---\n${partage.texte}`;
  const notesMisesAJour = projetExistant.notes
    ? `${projetExistant.notes}\n\n${noteAjoutee}`
    : noteAjoutee;

  const { error: updateError } = await supabase
    .from("demandes")
    .update({ notes: notesMisesAJour, derniere_modification_le: new Date().toISOString() })
    .eq("id", projetId);

  if (updateError) {
    return NextResponse.json({ error: "Impossible d'ajouter la note" }, { status: 500 });
  }

  await enregistrerEvenement(supabase, {
    demandeId: projetId,
    artisanId: user.id,
    organisationId,
    type: "message_importe",
    titre: "Message partagé ajouté au projet",
    detail: partage.texte,
  });

  // Même ménage best-effort que creer-depuis-brouillon : ne bloque jamais
  // l'action principale si la suppression échoue.
  await supabase.from("partages_entrants").delete().eq("id", partageId);

  return NextResponse.json({ projetId });
}
