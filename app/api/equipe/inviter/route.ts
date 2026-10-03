import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireMembership } from "@/lib/organisation";
import { envoyerEmailInvitation } from "@/lib/equipe/serveur";

// ============================================================
// Inviter quelqu'un dans son équipe (refonte 03/10, duel A — réécrite).
//
// Avant : on rattachait directement à l'équipe le compte qui portait
// l'adresse invitée, sans qu'il ait rien accepté, et la réponse disait au
// patron si l'adresse avait déjà un compte (409, ou le message brut de
// Supabase).
//
// Maintenant :
//   - on écrit une INVITATION (table invitations, Module 49), valable
//     14 jours ; la personne la confirme elle-même, connectée avec cette
//     adresse (voir /api/equipe/rejoindre) ;
//   - la réponse est la même que l'adresse ait un compte ou non ;
//   - « renvoyer » (un lien neuf, 14 jours de plus) et « annuler » ;
//   - dix envois par jour et par entreprise au plus : chaque envoi part
//     d'une adresse Compyo, on ne doit pas pouvoir s'en servir pour
//     arroser des adresses tierces.
//
// Réservée au propriétaire de l'entreprise. Client admin : les
// invitations n'ont aucune policy d'écriture (seul le serveur écrit).
// ============================================================

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLAFOND_PAR_JOUR = 10;
const VALIDITE_MS = 14 * 86400000;
const PLUS_EN_COURS = "Cette invitation n'est plus en cours.";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const lecture = await lireMembership(supabase, user.id);
  if (lecture.etat === "erreur") {
    return NextResponse.json({ error: "Pas de réseau. Réessayez." }, { status: 503 });
  }
  if (lecture.etat !== "membre" || lecture.role !== "proprietaire") {
    return NextResponse.json({ error: "Seul le titulaire du compte peut inviter." }, { status: 403 });
  }
  const organisationId = lecture.organisationId;

  const corps = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const action = typeof corps.action === "string" ? corps.action : "inviter";
  const admin = createAdminClient();

  // ---- Annuler ---------------------------------------------------------
  if (action === "annuler") {
    const id = corps.invitationId;
    if (typeof id !== "string" || !UUID.test(id)) {
      return NextResponse.json({ error: PLUS_EN_COURS }, { status: 400 });
    }
    const { data, error } = await admin
      .from("invitations")
      .update({ annulee_le: new Date().toISOString() })
      .eq("id", id)
      .eq("organisation_id", organisationId)
      .is("acceptee_le", null)
      .is("annulee_le", null)
      .select("id");
    if (error) {
      console.error("Annulation d'invitation impossible", error);
      return NextResponse.json({ error: "Pas enregistré. Réessayez." }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: PLUS_EN_COURS }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action !== "inviter" && action !== "renvoyer") {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  // ---- Le plafond (inviter comme renvoyer) ------------------------------
  const { count, error: erreurCompte } = await admin
    .from("logs")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .eq("type", "invitation_envoyee")
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());
  if (erreurCompte) {
    console.error("Invitation : comptage impossible", erreurCompte);
    return NextResponse.json({ error: "L'invitation n'est pas partie. Réessayez." }, { status: 500 });
  }
  if ((count ?? 0) >= PLAFOND_PAR_JOUR) {
    return NextResponse.json({ error: "Dix invitations par jour au plus. Réessayez demain." }, { status: 429 });
  }

  const nouvelleEcheance = new Date(Date.now() + VALIDITE_MS).toISOString();
  let invitation: { id: string; email: string; prenom: string } | null = null;

  // ---- Renvoyer ----------------------------------------------------------
  if (action === "renvoyer") {
    const id = corps.invitationId;
    if (typeof id !== "string" || !UUID.test(id)) {
      return NextResponse.json({ error: PLUS_EN_COURS }, { status: 400 });
    }
    const { data, error } = await admin
      .from("invitations")
      .update({ expire_le: nouvelleEcheance })
      .eq("id", id)
      .eq("organisation_id", organisationId)
      .is("acceptee_le", null)
      .is("annulee_le", null)
      .select("id, email, prenom");
    if (error) {
      console.error("Renvoi d'invitation impossible", error);
      return NextResponse.json({ error: "Pas enregistré. Réessayez." }, { status: 500 });
    }
    invitation = (data ?? [])[0] ?? null;
    if (!invitation) {
      return NextResponse.json({ error: PLUS_EN_COURS }, { status: 404 });
    }
  }

  // ---- Inviter -----------------------------------------------------------
  if (action === "inviter") {
    const nom = typeof corps.nom === "string" ? corps.nom.trim().replace(/\s+/g, " ") : "";
    const email = typeof corps.email === "string" ? corps.email.trim().toLowerCase() : "";
    if (nom.length < 1 || nom.length > 60) {
      return NextResponse.json({ error: "Indiquez le prénom et le nom (60 caractères au plus)." }, { status: 400 });
    }
    if (email.length > 254 || !FORMAT_EMAIL.test(email)) {
      return NextResponse.json({ error: "Cette adresse e-mail n'est pas valide." }, { status: 400 });
    }
    if (email === (user.email ?? "").toLowerCase()) {
      return NextResponse.json({ error: "C'est votre propre adresse." }, { status: 400 });
    }

    // Déjà dans l'équipe ? Comparé aux adresses des COMPTES (que personne
    // ne réécrit seul), jamais à profils.email. Ce n'est pas un oracle :
    // le patron voit déjà son équipe.
    const { data: lignes, error: erreurEquipe } = await admin
      .from("memberships")
      .select("user_id")
      .eq("organisation_id", organisationId);
    if (erreurEquipe) {
      console.error("Invitation : lecture de l'équipe impossible", erreurEquipe);
      return NextResponse.json({ error: "L'invitation n'est pas partie. Réessayez." }, { status: 500 });
    }
    for (const ligne of lignes ?? []) {
      if (ligne.user_id === user.id) continue;
      const { data } = await admin.auth.admin.getUserById(ligne.user_id);
      if (data.user?.email?.toLowerCase() === email) {
        return NextResponse.json({ error: "Cette personne fait déjà partie de l'équipe." }, { status: 409 });
      }
    }

    // Une invitation déjà en cours pour cette adresse : on la renouvelle.
    const { data: existante, error: erreurExistante } = await admin
      .from("invitations")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("email", email)
      .is("acceptee_le", null)
      .is("annulee_le", null)
      .maybeSingle();
    if (erreurExistante) {
      console.error("Invitation : lecture impossible", erreurExistante);
      return NextResponse.json({ error: "L'invitation n'est pas partie. Réessayez." }, { status: 500 });
    }
    const ecriture = existante
      ? admin
          .from("invitations")
          .update({ prenom: nom, expire_le: nouvelleEcheance, invite_par: user.id })
          .eq("id", existante.id)
          .select("id, email, prenom")
          .single()
      : admin
          .from("invitations")
          .insert({ organisation_id: organisationId, email, prenom: nom, invite_par: user.id })
          .select("id, email, prenom")
          .single();
    const { data, error } = await ecriture;
    if (error || !data) {
      console.error("Invitation : écriture impossible", error);
      return NextResponse.json({ error: "L'invitation n'est pas partie. Réessayez." }, { status: 500 });
    }
    invitation = data;
  }

  if (!invitation) {
    return NextResponse.json({ error: "L'invitation n'est pas partie. Réessayez." }, { status: 500 });
  }

  // ---- L'e-mail ------------------------------------------------------------
  const [{ data: profilInvitant }, { data: organisation }] = await Promise.all([
    admin.from("profils").select("nom").eq("id", user.id).maybeSingle(),
    admin.from("organisations").select("nom").eq("id", organisationId).maybeSingle(),
  ]);
  const entreprise = organisation?.nom?.trim() || "";
  const emailParti = await envoyerEmailInvitation(admin, invitation.email, {
    invite_par: profilInvitant?.nom?.trim() || entreprise || "Votre équipe",
    entreprise,
  });

  // La trace sert au plafond (et au support). Un échec ici ne change rien
  // pour l'invitation, déjà enregistrée.
  const { error: erreurTrace } = await admin.from("logs").insert({
    organisation_id: organisationId,
    artisan_id: user.id,
    type: "invitation_envoyee",
    contexte: invitation.id,
    details: { action, email_parti: emailParti },
  });
  if (erreurTrace) console.error("Invitation : trace non enregistrée", erreurTrace);

  // Toujours la même réponse : rien ne dit si l'adresse avait un compte.
  // emailParti ne vaut false que sur une panne d'envoi.
  return NextResponse.json({ ok: true, invitation: { id: invitation.id, prenom: invitation.prenom }, emailParti });
}
