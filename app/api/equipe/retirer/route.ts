import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireMembership } from "@/lib/organisation";

// Retire un membre de l'organisation (accès coupé immédiatement — utile
// quand un employé quitte l'entreprise). Ne supprime PAS son compte
// Supabase Auth ni son profil : seulement son "membership", ce qui suffit
// à lui couper tout accès via les RLS (voir Module 14, schema.sql). On
// pourrait vouloir plus tard réutiliser ce compte (ré-invitation dans une
// autre organisation), autant ne rien détruire d'irréversible ici.
//
// Refonte (03/10, duel A) :
//   - un propriétaire (et le créateur de l'entreprise) ne peut pas être
//     retiré : c'est lui qui invite, retire et tient l'IBAN ;
//   - si aucune ligne n'est supprimée, on le dit au lieu de répondre « ok » ;
//   - le reste est fait par la base (Module 48) : son nom est gardé dans
//     anciens_membres, ses abonnements push sont supprimés. Ses notes,
//     photos et projets restent à l'entreprise.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLUS_DANS_L_EQUIPE = "Cette personne ne fait plus partie de l'équipe.";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const membership = await lireMembership(supabase, user.id);
  if (membership.etat === "erreur") {
    return NextResponse.json({ error: "Pas de réseau. Réessayez." }, { status: 503 });
  }
  if (membership.etat !== "membre" || membership.role !== "proprietaire") {
    return NextResponse.json(
      { error: "Seul le titulaire du compte peut retirer quelqu'un de l'équipe." },
      { status: 403 }
    );
  }

  const corps = await request.json().catch(() => null);
  const userId = corps?.userId;
  if (typeof userId !== "string" || !UUID.test(userId)) {
    return NextResponse.json({ error: "Personne inconnue." }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas vous retirer vous-même." }, { status: 400 });
  }

  const admin = createAdminClient();

  const [{ data: cible, error: erreurCible }, { data: organisation, error: erreurOrganisation }] = await Promise.all([
    admin
      .from("memberships")
      .select("role")
      .eq("organisation_id", membership.organisationId)
      .eq("user_id", userId)
      .maybeSingle(),
    admin.from("organisations").select("cree_par").eq("id", membership.organisationId).maybeSingle(),
  ]);
  if (erreurCible || erreurOrganisation) {
    console.error("Retrait : lecture impossible", erreurCible ?? erreurOrganisation);
    return NextResponse.json({ error: "Impossible de retirer cette personne. Réessayez." }, { status: 500 });
  }
  if (!cible) {
    return NextResponse.json({ error: PLUS_DANS_L_EQUIPE }, { status: 404 });
  }
  if (cible.role === "proprietaire" || organisation?.cree_par === userId) {
    return NextResponse.json({ error: "Cette personne ne peut pas être retirée." }, { status: 403 });
  }

  const { data: supprimees, error } = await admin
    .from("memberships")
    .delete()
    .eq("organisation_id", membership.organisationId)
    .eq("user_id", userId)
    .eq("role", "employe")
    .select("user_id");

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de retirer cette personne. Réessayez." }, { status: 500 });
  }
  if (!supprimees || supprimees.length === 0) {
    return NextResponse.json({ error: PLUS_DANS_L_EQUIPE }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
