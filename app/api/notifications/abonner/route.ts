import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";

// Enregistre l'abonnement push du navigateur courant — appelée uniquement
// par lib/pwa/notifications.ts, au moment où l'artisan programme un
// rappel (voir commentaire de philosophie dans ce fichier).
export async function POST(request: NextRequest) {
  let corps: { endpoint?: string; cleP256dh?: string; cleAuth?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { endpoint, cleP256dh, cleAuth } = corps;
  if (!endpoint || !cleP256dh || !cleAuth) {
    return NextResponse.json({ error: "Abonnement incomplet" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const organisationId = await getOrganisationId(supabase, user.id);
  if (!organisationId) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }

  // "endpoint" est unique en base (voir Module 27bis) : upsert plutôt
  // qu'insert pour ne jamais échouer si ce même navigateur se réabonne
  // (ex. clés VAPID régénérées, ou navigateur qui renouvelle son
  // abonnement de lui-même après expiration).
  const { error } = await supabase
    .from("abonnements_push")
    .upsert(
      {
        organisation_id: organisationId,
        artisan_id: user.id,
        endpoint,
        cle_p256dh: cleP256dh,
        cle_auth: cleAuth,
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    return NextResponse.json({ error: "Impossible d'enregistrer l'abonnement" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
