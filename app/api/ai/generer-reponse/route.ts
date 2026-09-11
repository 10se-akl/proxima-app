import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude, ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";
import { listerNotesActivesProjet, formaterNotesPourPromptIA } from "@/lib/notes";

// Important : cette route ne fait QUE proposer un texte. Rien n'est jamais
// envoyé au client automatiquement — l'artisan copie, ajuste, et envoie
// lui-même par son propre moyen (SMS, email...). Voir la philosophie du
// produit : l'IA assiste, elle ne remplace jamais le contrôle de l'artisan.
const SYSTEM_PROMPT = `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

Rédige un brouillon de réponse professionnelle à envoyer à un client, à partir des informations du projet fournies. Ton naturel, courtois, direct — comme un artisan sérieux qui répond à un client, pas comme un email marketing.

Ne donne aucun prix ni engagement ferme sur les délais si l'information n'est pas fournie explicitement.

Réponds uniquement avec le texte du message, sans guillemets, sans formule "Voici votre message :", rien d'autre que le texte prêt à copier.`;

// Sprint Beta Final (27/08) — voir même commentaire dans preparer-brouillon.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { demandeId, contexteSupplementaire } = await request.json();

  if (!demandeId) {
    return NextResponse.json({ error: "demandeId requis" }, { status: 400 });
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

  // Audit IA (11/09) — manquait le même contexte que /api/ai/analyser-demande
  // et /api/ai/generer-devis (notes libres, notes vocales, notes
  // structurées) : sans ça, un brouillon de réponse au client pouvait
  // ignorer une info communiquée depuis (un contretemps dicté en note
  // vocale, une consigne enregistrée) — la route la moins bien informée des
  // trois alors que c'est justement celle dont le texte part vers un vrai
  // client. Les 3 requêtes sont indépendantes, lancées en parallèle.
  const [{ data: projet, error: fetchError }, { data: notesVocales }, notesActives] = await Promise.all([
    // Filtre organisation_id explicite en plus de la RLS : défense en
    // profondeur (relevé lors de l'audit du 12/08).
    supabase
      .from("demandes")
      .select("nom_client, description, informations_disponibles, notes, questions_manquantes")
      .eq("id", demandeId)
      .eq("organisation_id", organisationId)
      .single(),
    supabase
      .from("notes_vocales")
      .select("transcription, created_at")
      .eq("demande_id", demandeId)
      .order("created_at", { ascending: true }),
    listerNotesActivesProjet(supabase, demandeId),
  ]);

  if (fetchError || !projet) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const blocNotesVocales = (notesVocales ?? [])
    .map((n, i) => `Note vocale ${i + 1} : "${n.transcription}"`)
    .join("\n");

  const messageUtilisateur = `Client : ${projet.nom_client}
Projet : "${projet.description}"
Informations disponibles : "${projet.informations_disponibles ?? "aucune"}"
Notes libres de l'artisan : "${projet.notes ?? "aucune"}"
Notes importantes enregistrées par l'artisan pour ce projet :
${formaterNotesPourPromptIA(notesActives)}
${blocNotesVocales ? `\nNotes vocales dictées sur le terrain (les plus récentes reflètent l'état actuel du chantier) :\n${blocNotesVocales}` : ""}
${
  projet.questions_manquantes
    ? `Questions à poser au client : ${(projet.questions_manquantes.questions_suggerees ?? []).join(", ")}`
    : ""
}
${contexteSupplementaire ? `Contexte supplémentaire donné par l'artisan : "${contexteSupplementaire}"` : ""}`;

  const debutAppel = Date.now();
  try {
    const brouillon = await appelerClaude(SYSTEM_PROMPT, messageUtilisateur, request.signal);

    // Une réponse vide (ou blanche) n'est pas un cas géré ailleurs — sans ce
    // contrôle, l'artisan verrait un champ de brouillon vide sans le moindre
    // message d'erreur (relevé à l'audit IA du 25/08).
    if (!brouillon.trim()) {
      return NextResponse.json(
        { error: "L'IA n'a pas pu préparer de réponse. Réessayez." },
        { status: 502 }
      );
    }

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "reponse_generee",
      contexte: demandeId,
    });

    return NextResponse.json({ brouillon: brouillon.trim() });
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
        etape: "reponse_client",
        erreur: String(err),
        code: err instanceof ErreurIA ? err.code : undefined,
        duree_ms: dureeMs,
      },
    });
    return NextResponse.json({ error: message }, { status: statut });
  }
}
