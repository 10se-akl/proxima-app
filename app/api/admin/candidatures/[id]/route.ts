import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifierAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email === process.env.ADMIN_EMAIL;
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
