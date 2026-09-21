import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerAccesAccepte } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import type { Candidature } from "@/types";

async function verifierAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // 🔴 Audit sécurité (05/09) : `user?.email === process.env.ADMIN_EMAIL`
  // vaut `true` pour un visiteur NON CONNECTÉ si ADMIN_EMAIL n'est pas
  // défini en environnement (undefined === undefined) — accès admin total
  // sans authentification en cas d'oubli de variable d'env. `Boolean(user)`
  // court-circuite à `false` dans ce cas, quel que soit ADMIN_EMAIL.
  return Boolean(user && user.email === process.env.ADMIN_EMAIL);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const estAdmin = await verifierAdmin();
  if (!estAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { action } = await request.json();
  if (action !== "accepter" && action !== "refuser") {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: candidature, error: fetchError } = await admin
    .from("candidatures")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !candidature) {
    return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  }

  // Module 43 (21/09) — une candidature qui porte un user_id a été déposée
  // avec le nouveau formulaire : le compte existe déjà, avec le mot de
  // passe choisi par l'artisan. Les candidatures plus anciennes (sans
  // compte) gardent le chemin d'origine, plus bas : invitation par email.
  if (candidature.user_id) {
    return action === "accepter"
      ? accepterCompteExistant(admin, candidature as Candidature & { user_id: string })
      : refuserCompteExistant(admin, candidature as Candidature & { user_id: string });
  }

  if (action === "refuser") {
    await admin.from("candidatures").update({ statut: "rejected" }).eq("id", params.id);
    return NextResponse.json({ ok: true });
  }

  // Un même email peut légitimement revenir plusieurs fois (candidat qui
  // postule deux fois, test de l'admin, etc.) — si un profil existe déjà
  // pour cette adresse, inutile de retenter une invitation qui échouerait
  // de toute façon (Supabase refuse de créer un deuxième compte pour un
  // email déjà enregistré). On considère juste cette candidature traitée.
  const { data: profilExistant } = await admin
    .from("profils")
    .select("id")
    .eq("email", candidature.email)
    .maybeSingle();

  if (profilExistant) {
    await admin.from("candidatures").update({ statut: "accepted" }).eq("id", params.id);
    return NextResponse.json({
      ok: true,
      info: "Un compte existait déjà pour cet email — candidature marquée acceptée, aucune nouvelle invitation envoyée.",
    });
  }

  // action === "accepter" : crée le compte et envoie l'email d'invitation
  // (Supabase gère l'envoi de cet email lui-même, via son propre système).
  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    candidature.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/definir-mot-de-passe`,
    }
  );

  if (inviteError || !invite.user) {
    console.error(inviteError);
    // Un compte auth peut exister sans profil correspondant (ex : créé lors
    // d'un test précédent avant que cette vérification n'existe). Dans ce
    // cas Supabase refuse une deuxième invitation avec un message du type
    // "already been registered" — on répare l'incohérence au lieu d'échouer
    // platement, en retrouvant ce compte pour lui recréer son profil.
    const messageErreur = inviteError?.message?.toLowerCase() ?? "";
    if (messageErreur.includes("already") || messageErreur.includes("registered")) {
      const { data: listeUtilisateurs } = await admin.auth.admin.listUsers();
      const utilisateurExistant = listeUtilisateurs?.users.find(
        (u) => u.email?.toLowerCase() === candidature.email.toLowerCase()
      );
      if (utilisateurExistant) {
        const { error: profilError } = await admin.from("profils").insert({
          id: utilisateurExistant.id,
          nom: `${candidature.prenom} ${candidature.nom}`,
          entreprise: candidature.entreprise,
          metier: candidature.metier,
          email: candidature.email,
        });
        if (!profilError) {
          await creerOrganisationProprietaire(
            admin,
            utilisateurExistant.id,
            candidature.entreprise ?? `${candidature.prenom} ${candidature.nom}`
          );
          // Module 43 — ce compte existant peut être celui d'une seconde
          // candidature déposée avec le nouveau formulaire, donc « en
          // attente ». L'accepter ici sans l'activer le laisserait dehors.
          if (utilisateurExistant.app_metadata?.acces === "en_attente") {
            await admin.auth.admin.updateUserById(utilisateurExistant.id, {
              app_metadata: { acces: "actif" },
            });
          }
          await admin.from("candidatures").update({ statut: "accepted" }).eq("id", params.id);
          return NextResponse.json({
            ok: true,
            info: "Un compte existait déjà sans profil — profil recréé, candidature acceptée.",
          });
        }
      }
    }
    return NextResponse.json(
      { error: inviteError?.message ?? "Impossible de créer le compte / envoyer l'invitation" },
      { status: 500 }
    );
  }

  const { error: profilError } = await admin.from("profils").insert({
    id: invite.user.id,
    nom: `${candidature.prenom} ${candidature.nom}`,
    entreprise: candidature.entreprise,
    metier: candidature.metier,
    email: candidature.email,
  });

  if (profilError) {
    console.error(profilError);
    return NextResponse.json(
      { error: "Compte créé mais profil non enregistré" },
      { status: 500 }
    );
  }

  const orgError = await creerOrganisationProprietaire(
    admin,
    invite.user.id,
    candidature.entreprise ?? `${candidature.prenom} ${candidature.nom}`
  );
  if (orgError) {
    console.error(orgError);
    return NextResponse.json(
      { error: "Compte créé mais organisation non enregistrée" },
      { status: 500 }
    );
  }

  await admin.from("candidatures").update({ statut: "accepted" }).eq("id", params.id);

  return NextResponse.json({ ok: true });
}

// Chaque nouveau compte artisan (accepté depuis une candidature) devient
// automatiquement propriétaire de sa propre organisation — voir Module 14
// dans supabase/schema.sql. C'est ce qui lui permettra ensuite d'inviter
// un employé ou un conjoint sur SA même organisation plutôt que de créer
// un deuxième compte totalement cloisonné. Factorisé ici car utilisé à
// deux endroits de cette route (acceptation normale + réparation d'un
// compte auth existant sans profil).
async function creerOrganisationProprietaire(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  nomOrganisation: string
) {
  const { data: org, error: orgError } = await admin
    .from("organisations")
    .insert({ nom: nomOrganisation, cree_par: userId })
    .select("id")
    .single();

  if (orgError || !org) {
    return orgError ?? new Error("Organisation non créée");
  }

  const { error: membershipError } = await admin
    .from("memberships")
    .insert({ organisation_id: org.id, user_id: userId, role: "proprietaire" });

  return membershipError ?? null;
}

// ============================================================
// Module 43 (21/09) — accepter une candidature dont le compte existe déjà.
//
// Chaque étape est rejouable : si l'une échoue, Axel reclique sur
// « Accepter » et on reprend là où ça s'était arrêté, sans doublon. Et
// l'ordre est choisi pour qu'un échec laisse toujours le compte FERMÉ :
// le statut ne passe à "actif" qu'une fois le profil et l'organisation
// en place.
// ============================================================
async function accepterCompteExistant(
  admin: ReturnType<typeof createAdminClient>,
  candidature: Candidature & { user_id: string }
) {
  const userId = candidature.user_id;
  const nomComplet = `${candidature.prenom} ${candidature.nom}`;

  // 1. Profil
  const { data: profil } = await admin.from("profils").select("id").eq("id", userId).maybeSingle();
  if (!profil) {
    const { error } = await admin.from("profils").insert({
      id: userId,
      nom: nomComplet,
      entreprise: candidature.entreprise,
      metier: candidature.metier,
      email: candidature.email,
    });
    if (error) {
      console.error("Acceptation : profil non créé —", error.message);
      return NextResponse.json({ error: "Profil non créé. Le compte reste fermé : réessayez." }, { status: 500 });
    }
  }

  // 2. Organisation (dont il devient propriétaire)
  const { data: membership } = await admin
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) {
    const erreurOrg = await creerOrganisationProprietaire(admin, userId, candidature.entreprise ?? nomComplet);
    if (erreurOrg) {
      console.error("Acceptation : organisation non créée —", erreurOrg);
      return NextResponse.json(
        { error: "Organisation non créée. Le compte reste fermé : réessayez." },
        { status: 500 }
      );
    }
  }

  // 3. Ouverture du compte — en dernier, une fois tout le reste en place.
  // Supabase fusionne app_metadata : les autres clés (fournisseur de
  // connexion) sont conservées.
  const { error: erreurOuverture } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { acces: "actif" },
  });
  if (erreurOuverture) {
    console.error("Acceptation : ouverture du compte impossible —", erreurOuverture.message);
    return NextResponse.json(
      { error: "Profil prêt, mais le compte n'a pas pu être ouvert. Réessayez." },
      { status: 500 }
    );
  }

  await admin.from("candidatures").update({ statut: "accepted" }).eq("id", candidature.id);

  // 4. Prévenir l'artisan. Un échec ici n'annule rien (il peut déjà se
  // connecter) — mais Axel doit le savoir, pour le prévenir lui-même.
  let info: string | undefined;
  try {
    const envoi = await envoyerAccesAccepte({
      destinataire: candidature.email,
      prenom: candidature.prenom,
      urlConnexion: `${SITE_URL}/login`,
    });
    if (envoi === "non_configure") {
      info = `Accès ouvert. Aucun email n'est parti (RESEND_FROM_EMAIL n'est pas configuré) : préviens ${candidature.prenom} toi-même au ${candidature.telephone}.`;
    }
  } catch (err) {
    console.error("Acceptation : email d'accès non envoyé —", err);
    info = `Accès ouvert, mais l'email n'a pas pu partir : préviens ${candidature.prenom} toi-même au ${candidature.telephone}.`;
  }

  return NextResponse.json({ ok: true, ...(info ? { info } : {}) });
}

// Refuser : le compte est SUPPRIMÉ, pas désactivé (choix d'Axel, 21/09).
// Garder un compte inutilisable avec un mot de passe n'a aucune utilité,
// et le RGPD demande de ne pas conserver sans raison. La candidature
// reste, marquée refusée, pour l'historique ; son user_id repasse à null
// tout seul (on delete set null). La personne pourra recandidater.
async function refuserCompteExistant(
  admin: ReturnType<typeof createAdminClient>,
  candidature: Candidature & { user_id: string }
) {
  // Suppression d'abord : c'est l'action qui compte. Si elle échoue, rien
  // n'a changé et Axel peut simplement réessayer.
  const { error: erreurSuppression } = await admin.auth.admin.deleteUser(candidature.user_id);
  if (erreurSuppression) {
    console.error("Refus : suppression du compte impossible —", erreurSuppression.message);
    return NextResponse.json(
      { error: "Le compte n'a pas pu être supprimé. Rien n'a changé : réessayez." },
      { status: 500 }
    );
  }

  await admin.from("candidatures").update({ statut: "rejected" }).eq("id", candidature.id);
  return NextResponse.json({ ok: true });
}
