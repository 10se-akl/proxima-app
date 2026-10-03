import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganisationId } from "@/lib/organisation";

// Enregistre l'abonnement push du navigateur courant — appelée uniquement
// par lib/pwa/notifications.ts, au moment où l'artisan programme un
// rappel (voir commentaire de philosophie dans ce fichier).
//
// Refonte (03/10, duel A) — F10 : la table abonnements_push était ouverte
// en lecture et en écriture à toute l'équipe (un membre lisait les clés
// de ses coéquipiers, ou s'abonnait « au nom du patron » pour recevoir
// ses notifications). Le Module 52 ne laisse au navigateur que la lecture
// et la suppression de SES abonnements. L'écriture passe donc ici, avec
// le client admin, toujours au nom de l'utilisateur vérifié et pour son
// entreprise. Même upsert sur « endpoint » qu'avant : sur un ordinateur
// partagé (le bureau du soir), le deuxième compte qui active les
// notifications reprend l'abonnement de ce navigateur au lieu d'échouer.
export async function POST(request: NextRequest) {
  let corps: { endpoint?: unknown; cleP256dh?: unknown; cleAuth?: unknown };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { endpoint, cleP256dh, cleAuth } = corps;
  if (
    typeof endpoint !== "string" ||
    typeof cleP256dh !== "string" ||
    typeof cleAuth !== "string" ||
    !endpoint ||
    !cleP256dh ||
    !cleAuth
  ) {
    return NextResponse.json({ error: "Abonnement incomplet" }, { status: 400 });
  }
  // Le client admin contourne la RLS : on borne ce qu'il écrit.
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || cleP256dh.length > 200 || cleAuth.length > 200) {
    return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });
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
  const { error } = await createAdminClient()
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
    console.error("Abonnement push non enregistré", error);
    return NextResponse.json({ error: "Impossible d'enregistrer l'abonnement" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
