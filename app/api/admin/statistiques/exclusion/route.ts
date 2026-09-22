import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Exclure un compte de test des statistiques d'usage (Module 44, 22/09).
// Réservé à l'administrateur, comme toutes les routes /api/admin.
export async function POST(request: NextRequest) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const corps = await request.json().catch(() => null);
  const organisationId = typeof corps?.organisationId === "string" ? corps.organisationId : null;
  if (!organisationId || typeof corps?.exclu !== "boolean") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("organisations")
    .update({ exclue_des_stats: corps.exclu })
    .eq("id", organisationId);
  if (error) {
    console.error("Statistiques : exclusion impossible —", error.message);
    return NextResponse.json({ error: "Mise à jour impossible (Module 44 appliqué ?)" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
