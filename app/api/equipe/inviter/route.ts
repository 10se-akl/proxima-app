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

  const { nom, email: emailBrut } = await request.json();
  if (!nom || typeof nom !== "string" || !emailBrut || typeof emailBrut !== "string") {
    return NextResponse.json({ error: "Nom et email requis" }, { status: 400 });
  }
  const email = emailBrut.trim().toLowerCase();

  const admin = createAdminClient();

  // Refonte (01/10) — 🔴 "profils.email" est modifiable par son titulaire
  // (policy update sur profils) : un compte sans équipe pouvait y écrire
  // l'adresse qu'un patron s'apprêtait à inviter, et recevait alors le
  // membership à la place de la vraie personne. On ne se fie donc qu'à
  // l'e-mail du compte Auth, que l'utilisateur ne peut pas réécrire seul.
  const { data: profilsMemeEmail } = await admin
    .from("profils")
    .select("id")
    .ilike("email", email)
    .limit(5);
  let profilExistant: { id: string } | null = null;
  for (const p of profilsMemeEmail ?? []) {
    const { data } = await admin.auth.admin.getUserById(p.id);
    if (data.user?.email?.toLowerCase() === email) {
      profilExistant = p;
      break;
    }
  }
  if (profilExistant) {
    // Audit (11/09) — 🟠 avant ce correctif, ce blocage était inconditionnel
    // dès qu'un profil existait pour cet email, y compris pour un compte
    // retiré d'une équipe via /api/equipe/retirer — qui, lui, supprime
    // volontairement SEULEMENT le membership (pas le profil ni le compte
    // Auth) explicitement pour permettre une ré-invitation plus tard (voir
    // le commentaire de ce fichier). Un profil sans AUCUN membership actif
    // n'est donc pas "déjà pris" : on réactive directement l'accès plutôt
    // que de bloquer un cas que le code de retrait prévoyait pourtant.
    // Pas de .maybeSingle() ici : il lèverait une erreur (et renverrait
    // data = null, donc "aucun membership" à tort) si le compte appartenait
    // à plusieurs organisations. On compte les lignes, et on considère une
    // erreur de lecture comme "membership peut-être présent" — jamais
    // réactiver un accès sur la foi d'une requête qui a échoué.
    const { data: membershipsExistants, error: erreurMemberships } = await admin
      .from("memberships")
      .select("id")
      .eq("user_id", profilExistant.id);

    if (erreurMemberships) {
      console.error(erreurMemberships);
      return NextResponse.json(
        { error: "Impossible de vérifier ce compte. Réessayez." },
        { status: 500 }
      );
    }

    if ((membershipsExistants ?? []).length > 0) {
      return NextResponse.json(
        { error: "Un compte Compyo existe déjà pour cet email" },
        { status: 409 }
      );
    }

    const { error: reactivationError } = await admin.from("memberships").insert({
      organisation_id: membership.organisationId,
      user_id: profilExistant.id,
      role: "employe",
    });
    if (reactivationError) {
      console.error(reactivationError);
      return NextResponse.json({ error: "Impossible de réactiver ce membre" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
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
