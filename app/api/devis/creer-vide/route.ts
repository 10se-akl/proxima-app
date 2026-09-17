import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerLog } from "@/lib/logs";
import { PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import { conditionsParDefaut } from "@/lib/devis/mentionsLegales";
import { estColonneManquante, MESSAGE_BASE_PAS_A_JOUR } from "@/lib/supabase/erreurs";
import type { ParametresEntreprise } from "@/types";

// ============================================================
// "Devis express" (06/09) — audit métier : les métiers d'urgence pure
// (serrurier, vitrier, dépannage plombier/électricien) chiffrent sur place,
// dans l'instant, souvent en une seule visite — le cycle habituel
// (description → analyse IA → génération IA → relecture) est trop lent
// pour ce cas précis et n'apporte rien : il n'y a rien à analyser, le
// travail est déjà fait au moment où l'artisan chiffre. Cette route saute
// directement à un devis "brouillon" avec une ligne vide, prête à remplir
// à la main dans l'écran de validation déjà existant (ValiderDevis) —
// aucun appel IA, donc aucun garde-fou de fréquence à vérifier ici.
// ============================================================

export async function POST(request: NextRequest) {
  const { demandeId } = await request.json();

  if (!demandeId) {
    return NextResponse.json({ error: "demandeId requis" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = user.id;

  const organisationId = await getOrganisationId(supabase, userId);
  if (!organisationId) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }

  // Filtre organisation_id explicite en plus de la RLS : même discipline
  // que le reste des routes serveur.
  const { data: projet, error: fetchError } = await supabase
    .from("demandes")
    .select("id")
    .eq("id", demandeId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (fetchError || !projet) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const { data: parametresBrutes } = await supabase
    .from("parametres_entreprise")
    .select("*")
    .eq("organisation_id", organisationId)
    .maybeSingle();
  const parametresConfigures = Boolean(parametresBrutes);
  const parametres: ParametresEntreprise = parametresBrutes
    ? (parametresBrutes as ParametresEntreprise)
    : { id: "defaut", artisan_id: userId, organisation_id: organisationId, ...PARAMETRES_PAR_DEFAUT };

  // Même logique de numérotation séquentielle par organisation/année, avec
  // retry sur conflit, que les autres routes qui créent un devis (voir
  // /api/ai/generer-devis et /api/devis/dupliquer) — dupliquée ici plutôt
  // que factorisée pour l'instant, comme déjà assumé ailleurs dans ces
  // deux routes.
  const anneeCourante = new Date().getFullYear();
  const MAX_TENTATIVES_NUMERO = 5;

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
        demande_id: demandeId,
        artisan_id: userId,
        organisation_id: organisationId,
        numero,
        lignes: [
          {
            description: "",
            categorie: "forfait",
            quantite: 1,
            unite: "forfait",
            prix_unitaire: 0,
            total: 0,
            detail_calcul: "Ligne à compléter — devis express, aucun calcul automatique",
          },
        ],
        sous_total_ht: 0,
        deplacement: parametres.forfait_deplacement ?? 0,
        marge_pct: parametres.marge_defaut_pct ?? 0,
        tva_pct: parametres.tva_pct ?? 20,
        montant_tva: 0,
        total_estime: 0,
        statut: "brouillon",
        parametres_configures: parametresConfigures,
        ...conditionsParDefaut(parametresBrutes as Partial<ParametresEntreprise> | null),
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
    // L'erreur réelle est tracée : c'est ce qui a permis de diagnostiquer
    // en une minute les migrations manquantes des 12 et 13/09.
    console.error("Impossible de créer le devis express :", insertError);
    return NextResponse.json(
      { error: estColonneManquante(insertError) ? MESSAGE_BASE_PAS_A_JOUR : "Impossible de créer le devis express" },
      { status: 500 }
    );
  }

  await enregistrerLog(supabase, {
    artisanId: userId,
    organisationId,
    type: "devis_genere",
    contexte: demandeId,
    details: { action: "devis_express" },
  });

  return NextResponse.json({ devis });
}
