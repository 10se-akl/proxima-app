import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { preparerBrouillonDepuisTexte } from "@/lib/ai/brouillonProjet";
import { ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";

// ============================================================
// "Premier contact sans friction" (26/08) — remplace la création directe
// de app/api/ai/importer-message (conservée pour compatibilité mais plus
// appelée par aucun écran, voir rapport de cycle). Ne touche JAMAIS la
// table "demandes" : renvoie uniquement un brouillon à faire valider par
// l'artisan (voir app/api/demandes/creer-depuis-brouillon pour la suite).
// ============================================================

// Sprint Beta Final (27/08) — QA : lib/ai/client.ts peut prendre jusqu'à
// ~77s dans le pire cas (3 tentatives × 25s + attentes de backoff). Sans
// maxDuration explicite, Vercel applique la limite par défaut du plan
// (10-15s selon config) et tue la fonction avant que la gestion d'erreur
// soignée de lib/ai/client.ts ne puisse s'exécuter — l'artisan reçoit alors
// un 504 brut de la plateforme au lieu du message français prévu. 60s est
// le maximum utilisable sur le plan Hobby de Vercel ; si le plan est
// supérieur (Pro/Enterprise), cette valeur peut être montée sans risque.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // QA : un corps JSON malformé (requête rejouée par le service worker,
  // proxy qui tronque...) faisait planter cette route avant même d'entrer
  // dans le bloc try/catch existant plus bas.
  let corps: { texte?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { texte } = corps;

  if (!texte || typeof texte !== "string" || texte.trim().length < 5) {
    return NextResponse.json(
      { error: "Le texte est trop court pour être analysé" },
      { status: 400 }
    );
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

  const limite = await verifierLimiteIA(supabase, organisationId);
  if (!limite.autorise) {
    return NextResponse.json({ error: limite.message }, { status: 429 });
  }

  const debutAppel = Date.now();
  try {
    const brouillon = await preparerBrouillonDepuisTexte(texte, request.signal);

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "analyse_ia",
      contexte: undefined,
      details: { etape: "preparer_brouillon", duree_ms: Date.now() - debutAppel },
    });

    return NextResponse.json({ brouillon });
  } catch (err) {
    const dureeMs = Date.now() - debutAppel;
    if (err instanceof ErreurIA && err.code === "annule") {
      return NextResponse.json({ error: "Requête annulée." }, { status: 499 });
    }
    console.error(err);
    const { message, statut } = reponseErreurIA(err);
    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "erreur_ia",
      contexte: undefined,
      details: {
        etape: "preparer_brouillon",
        erreur: String(err),
        code: err instanceof ErreurIA ? err.code : undefined,
        duree_ms: dureeMs,
      },
    });
    return NextResponse.json({ error: message }, { status: statut });
  }
}
