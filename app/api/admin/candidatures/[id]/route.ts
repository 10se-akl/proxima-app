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
    return NextResponse.json(
      { error: "Impossible de créer le compte / envoyer l'invitation" },
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

  await admin.from("candidatures").update({ statut: "accepted" }).eq("id", params.id);

  return NextResponse.json({ ok: true });
}
