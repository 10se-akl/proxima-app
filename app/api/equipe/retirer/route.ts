import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/organisation";

// Retire un membre de l'organisation (accès coupé immédiatement — utile
// quand un employé quitte l'entreprise). Ne supprime PAS son compte
// Supabase Auth ni son profil : seulement son "membership", ce qui suffit
// à lui couper tout accès via les RLS (voir Module 14, schema.sql). On
// pourrait vouloir plus tard réutiliser ce compte (ré-invitation dans une
// autre organisation), autant ne rien détruire d'irréversible ici.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const membership = await getMembership(supabase, user.id);
  if (!membership || membership.role !== "proprietaire") {
    return NextResponse.json(
      { error: "Seul le propriétaire du compte peut retirer un membre" },
      { status: 403 }
    );
  }

  const { userId } = await request.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: "Impossible de se retirer soi-même de l'organisation" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("memberships")
    .delete()
    .eq("organisation_id", membership.organisationId)
    .eq("user_id", userId);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de retirer ce membre" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
