import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/organisation";

// Invite un nouveau membre (employé/conjoint...) dans l'organisation de
// l'artisan connecté. Contrairement à /api/admin/candidatures/[id], cette
// route n'est pas réservée à l'admin Compyo : n'importe quel propriétaire
// d'organisation peut inviter quelqu'un dans SA propre équipe. Voir Module
// 14 dans supabase/schema.sql pour le contexte du modèle organisation/
// membership.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const membership = await getMembership(supabase, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }
  if (membership.role !== "proprietaire") {
    return NextResponse.json(
      { error: "Seul le propriétaire du compte peut inviter un membre" },
      { status: 403 }
    );
  }

  const { nom, email } = await request.json();
  if (!nom || typeof nom !== "string" || !email || typeof email !== "string") {
    return NextResponse.json({ error: "Nom et email requis" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profilExistant } = await admin
    .from("profils")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profilExistant) {
    return NextResponse.json(
      { error: "Un compte Compyo existe déjà pour cet email" },
      { status: 409 }
    );
  }

  // On récupère le métier/l'entreprise du propriétaire pour préremplir le
  // profil du nouveau membre : ces champs existent encore sur "profils"
  // pour l'affichage, mais ne pilotent plus l'accès aux données (c'est le
  // rôle de "memberships" désormais).
  const { data: profilProprietaire } = await admin
    .from("profils")
    .select("metier, entreprise")
    .eq("id", user.id)
    .single();

  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/definir-mot-de-passe`,
  });

  if (inviteError || !invite.user) {
    console.error(inviteError);
    return NextResponse.json(
      { error: inviteError?.message ?? "Impossible d'envoyer l'invitation" },
      { status: 500 }
    );
  }

  const { error: profilError } = await admin.from("profils").insert({
    id: invite.user.id,
    nom,
    entreprise: profilProprietaire?.entreprise ?? null,
    metier: profilProprietaire?.metier ?? "autre",
    email,
  });

  if (profilError) {
    console.error(profilError);
    return NextResponse.json(
      { error: "Invitation envoyée mais profil non enregistré" },
      { status: 500 }
    );
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    organisation_id: membership.organisationId,
    user_id: invite.user.id,
    role: "employe",
  });

  if (membershipError) {
    console.error(membershipError);
    return NextResponse.json(
      { error: "Invitation envoyée mais rattachement à l'équipe échoué" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
