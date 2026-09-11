import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude, parserReponseJSON, ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";

// ============================================================
// Journal chantier vocal (06/09) — cette route ne fait QUE lire une
// transcription déjà enregistrée (voir components/dashboard/NotesVocales.tsx,
// qui l'appelle juste après l'ajout d'une note vocale) et en extraire une
// structure exploitable. Elle ne crée ni note ni événement de timeline
// elle-même — c'est l'appelant (NotesVocales.tsx) qui décide quoi faire du
// résultat, exactement comme /api/ai/generer-reponse ne fait que proposer
// un brouillon sans jamais l'envoyer. Aucun prix, aucun engagement de délai
// non mentionné explicitement par l'artisan : mêmes garde-fous que partout
// ailleurs dans Compyo.
// ============================================================

type ReponseInterpretation = {
  taches_restantes?: unknown;
  brouillon_message_client?: unknown;
  rappel_lendemain?: unknown;
  chantier_semble_termine?: unknown;
  urgence_detectee?: unknown;
};

const MAX_TACHES = 5;

const SYSTEM_PROMPT = `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

Un artisan vient de dicter un compte-rendu de fin de visite sur un chantier précis. Analyse ce texte et structure-le, sans jamais inventer d'information qui n'y figure pas.

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte :
{
  "taches_restantes": ["...", "..."],
  "brouillon_message_client": "..." ou null,
  "rappel_lendemain": true ou false,
  "chantier_semble_termine": true ou false,
  "urgence_detectee": true ou false
}

Règles :
- "taches_restantes" : 0 à ${MAX_TACHES} tâches courtes et concrètes qui restent à faire sur CE chantier d'après le texte. Liste vide si rien de nouveau n'est à faire.
- "brouillon_message_client" : un court message à envoyer au client, UNIQUEMENT si le texte contient une information que le client attend probablement (avancement, contretemps, date de retour). Sinon null. Jamais de prix, jamais d'engagement de délai qui n'est pas mentionné explicitement dans le texte.
- "rappel_lendemain" : vrai uniquement si le texte indique explicitement ou clairement qu'une suite est prévue le lendemain.
- "chantier_semble_termine" : vrai UNIQUEMENT si le texte indique clairement que l'intervention est terminée, pas juste une étape franchie. En cas de doute, réponds false.
- "urgence_detectee" : vrai UNIQUEMENT si le texte indique clairement que ce chantier doit désormais être traité en priorité (le client insiste explicitement, la situation s'aggrave, conséquence financière ou de sécurité clairement liée à la rapidité d'intervention). Faux par défaut, y compris en cas de doute.`;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { demandeId, transcription } = await request.json();

  if (!demandeId || !transcription || typeof transcription !== "string" || !transcription.trim()) {
    return NextResponse.json({ error: "demandeId et transcription requis" }, { status: 400 });
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

  // Filtre organisation_id explicite en plus de la RLS — même discipline
  // que le reste des routes serveur.
  const [{ data: projet }, { data: profil }] = await Promise.all([
    supabase
      .from("demandes")
      .select("nom_client")
      .eq("id", demandeId)
      .eq("organisation_id", organisationId)
      .maybeSingle(),
    supabase.from("profils").select("metier").eq("id", user.id).single(),
  ]);

  if (!projet) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const messageUtilisateur = `Client : ${projet.nom_client}
Métier de l'artisan : ${profil?.metier ?? "non précisé"}
Compte-rendu dicté : "${transcription.trim()}"`;

  const debutAppel = Date.now();
  try {
    const reponseTexte = await appelerClaude(SYSTEM_PROMPT, messageUtilisateur, request.signal);
    const brut = parserReponseJSON<ReponseInterpretation>(reponseTexte);

    // Tolérance sur une réponse partiellement mal formée : on garde ce qui
    // est exploitable plutôt que de tout rejeter — cette interprétation est
    // une aide annexe à la note déjà enregistrée, pas le contenu principal.
    const tachesRestantes = Array.isArray(brut.taches_restantes)
      ? brut.taches_restantes.filter((t): t is string => typeof t === "string" && t.trim().length > 0).slice(0, MAX_TACHES)
      : [];
    const brouillonMessageClient =
      typeof brut.brouillon_message_client === "string" && brut.brouillon_message_client.trim()
        ? brut.brouillon_message_client.trim()
        : null;
    const rappelLendemain = brut.rappel_lendemain === true;
    const chantierSembleTermine = brut.chantier_semble_termine === true;
    const urgenceDetectee = brut.urgence_detectee === true;

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "journal_chantier_interprete",
      contexte: demandeId,
      details: {
        nb_taches: tachesRestantes.length,
        chantier_semble_termine: chantierSembleTermine,
        urgence_detectee: urgenceDetectee,
      },
    });

    return NextResponse.json({
      tachesRestantes,
      brouillonMessageClient,
      rappelLendemain,
      chantierSembleTermine,
      urgenceDetectee,
    });
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
      contexte: demandeId,
      details: {
        etape: "journal_chantier",
        erreur: String(err),
        code: err instanceof ErreurIA ? err.code : undefined,
        duree_ms: dureeMs,
      },
    });
    return NextResponse.json({ error: message }, { status: statut });
  }
}
