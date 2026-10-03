import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerLienRejoindre, etatRejoindre, invitationEnCours, preuveBoiteMail } from "@/lib/equipe/serveur";

// ============================================================
// Rejoindre une équipe (refonte 03/10, duel A).
//
// GET : où en est le compte connecté (invitation en cours, déjà membre,
// retiré, rien). C'est CE serveur qui dit « accès retiré » : la page
// /rejoindre ne l'affiche que sur sa réponse explicite, jamais sur une
// panne réseau (getOrganisationId renvoie null dans les deux cas).
//
// Client admin : la personne n'est encore membre d'aucune équipe, la RLS
// lui cache donc les invitations qui la concernent. Les lectures sont
// toutes bornées à son propre compte et à sa propre adresse.
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();

  try {
    const etat = await etatRejoindre(createAdminClient(), user, session?.access_token);
    return NextResponse.json(etat, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Rejoindre : lecture de l'état impossible", err);
    return NextResponse.json({ error: "Impossible de vérifier votre accès. Réessayez." }, { status: 500 });
  }
}

// ============================================================
// POST — deux actions, toujours pour le compte connecté lui-même.
//
// « lien » : renvoie à sa propre adresse un lien de connexion vers
// /rejoindre (quand il s'est connecté par mot de passe : la session ne
// prouve pas qu'il possède la boîte mail). Seulement s'il a une
// invitation en cours : cette route n'envoie pas d'e-mail à la demande.
//
// « rejoindre » : il accepte l'invitation. Exige :
//   - une invitation en cours à SON adresse (celle du compte) ;
//   - une session ouverte par un lien reçu dans cette boîte (invitation,
//     lien de connexion, réinitialisation) : un compte créé avec
//     l'adresse d'un autre ne peut pas s'en servir ;
//   - pour un compte « en attente » (créé par la demande d'accès, sans
//     preuve de l'adresse) : un nouveau mot de passe, posé ici, et les
//     autres sessions fermées. Quelqu'un qui aurait réservé l'adresse
//     d'un autre perd ainsi la main sur le compte.
// La personne passe alors devant la liste d'attente (accès « actif »,
// décision du fondateur du 03/10), puis entre dans l'équipe.
// ============================================================

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLUS_VALABLE = "Cette invitation n'est plus valable. Demandez-en une nouvelle.";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const email = (user.email ?? "").trim().toLowerCase();
  const corps = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const admin = createAdminClient();

  // ---- Recevoir le lien ----------------------------------------------------
  if (corps.action === "lien") {
    try {
      if (!(await invitationEnCours(admin, email))) {
        return NextResponse.json({ error: "Aucune invitation en cours." }, { status: 404 });
      }
    } catch (err) {
      console.error("Rejoindre : lecture de l'invitation impossible", err);
      return NextResponse.json({ error: "Pas de réseau. Réessayez." }, { status: 500 });
    }
    if (!(await envoyerLienRejoindre(email))) {
      return NextResponse.json({ error: "Le lien n'est pas parti. Réessayez dans une minute." }, { status: 429 });
    }
    return NextResponse.json({ ok: true });
  }

  if (corps.action !== "rejoindre") {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
  const invitationId = corps.invitationId;
  if (typeof invitationId !== "string" || !UUID.test(invitationId)) {
    return NextResponse.json({ error: PLUS_VALABLE }, { status: 400 });
  }

  const [{ data: membre, error: erreurMembre }, { data: invitation, error: erreurInvitation }] = await Promise.all([
    admin.from("memberships").select("organisation_id").eq("user_id", user.id).maybeSingle(),
    admin
      .from("invitations")
      .select("id, organisation_id, prenom, invite_par, acceptee_le, annulee_le, expire_le")
      .eq("id", invitationId)
      .eq("email", email)
      .maybeSingle(),
  ]);
  if (erreurMembre || erreurInvitation) {
    console.error("Rejoindre : lecture impossible", erreurMembre ?? erreurInvitation);
    return NextResponse.json({ error: "Pas de réseau. Réessayez." }, { status: 500 });
  }

  // Déjà dans l'équipe (double appui, page rechargée) : c'est fait.
  if (membre) {
    if (invitation && invitation.organisation_id === membre.organisation_id) {
      if (!invitation.acceptee_le) {
        await admin.from("invitations").update({ acceptee_le: new Date().toISOString() }).eq("id", invitation.id);
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: "Votre compte fait déjà partie d'une autre entreprise sur Compyo." },
      { status: 409 }
    );
  }

  if (
    !invitation ||
    invitation.acceptee_le ||
    invitation.annulee_le ||
    Date.parse(invitation.expire_le) <= Date.now()
  ) {
    return NextResponse.json({ error: PLUS_VALABLE }, { status: 404 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!preuveBoiteMail(session?.access_token, user.id)) {
    return NextResponse.json(
      { error: "Ouvrez le lien reçu par e-mail pour confirmer votre adresse.", code: "preuve" },
      { status: 403 }
    );
  }

  // ---- Le compte : mot de passe (si « en attente ») et accès ouvert --------
  const enAttente = user.app_metadata?.acces === "en_attente";
  if (enAttente) {
    const motDePasse = corps.motDePasse;
    if (typeof motDePasse !== "string" || motDePasse.length < 8 || motDePasse.length > 72) {
      return NextResponse.json(
        { error: "Choisissez un mot de passe de 8 caractères au moins.", code: "mot_de_passe" },
        { status: 400 }
      );
    }
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: motDePasse,
      app_metadata: { acces: "actif" },
    });
    if (error) {
      console.error("Rejoindre : ouverture du compte impossible", error.message);
      return NextResponse.json({ error: "Votre accès n'a pas pu s'ouvrir. Réessayez." }, { status: 500 });
    }
  } else if (user.app_metadata?.acces !== "actif") {
    const { error } = await admin.auth.admin.updateUserById(user.id, { app_metadata: { acces: "actif" } });
    if (error) console.error("Rejoindre : statut d'accès non posé", error.message);
  }

  // ---- Le profil (nom choisi par l'invitant, métier de l'entreprise) ------
  const { data: profil, error: erreurProfil } = await admin.from("profils").select("id").eq("id", user.id).maybeSingle();
  if (erreurProfil) {
    console.error("Rejoindre : lecture du profil impossible", erreurProfil);
    return NextResponse.json({ error: "Pas enregistré. Réessayez." }, { status: 500 });
  }
  if (!profil) {
    const { data: modele } = invitation.invite_par
      ? await admin.from("profils").select("metier, entreprise").eq("id", invitation.invite_par).maybeSingle()
      : { data: null };
    const { error } = await admin.from("profils").insert({
      id: user.id,
      nom: invitation.prenom,
      entreprise: modele?.entreprise ?? null,
      metier: modele?.metier ?? "autre",
      email,
    });
    if (error) {
      console.error("Rejoindre : profil non créé", error);
      return NextResponse.json({ error: "Pas enregistré. Réessayez." }, { status: 500 });
    }
  }

  // ---- L'équipe ------------------------------------------------------------
  const { error: erreurAjout } = await admin
    .from("memberships")
    .insert({ organisation_id: invitation.organisation_id, user_id: user.id, role: "employe" });
  if (erreurAjout) {
    console.error("Rejoindre : ajout à l'équipe impossible", erreurAjout);
    const dejaAilleurs = erreurAjout.code === "23505";
    return NextResponse.json(
      {
        error: dejaAilleurs
          ? "Votre compte fait déjà partie d'une autre entreprise sur Compyo."
          : "Pas enregistré. Réessayez.",
      },
      { status: dejaAilleurs ? 409 : 500 }
    );
  }

  const [{ error: erreurAcceptee }, { error: erreurCandidature }] = await Promise.all([
    admin.from("invitations").update({ acceptee_le: new Date().toISOString() }).eq("id", invitation.id),
    // Plus rien à examiner dans la liste d'attente : la personne est entrée.
    admin.from("candidatures").update({ statut: "accepted" }).eq("user_id", user.id).eq("statut", "pending"),
  ]);
  if (erreurAcceptee) console.error("Rejoindre : invitation non marquée acceptée", erreurAcceptee);
  if (erreurCandidature) console.error("Rejoindre : candidature non mise à jour", erreurCandidature);

  if (enAttente && session?.access_token) {
    const { error } = await admin.auth.admin.signOut(session.access_token, "others");
    if (error) console.error("Rejoindre : autres sessions non fermées", error.message);
  }

  return NextResponse.json({ ok: true });
}
