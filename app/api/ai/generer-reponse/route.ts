import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";

// Important : cette route ne fait QUE proposer un texte. Rien n'est jamais
// envoyé au client automatiquement — l'artisan copie, ajuste, et envoie
// lui-même par son propre moyen (SMS, email...). Voir la philosophie du
// produit : l'IA assiste, elle ne remplace jamais le contrôle de l'artisan.
const SYSTEM_PROMPT = `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

Rédige un brouillon de réponse professionnelle à envoyer à un client, à partir des informations du projet fournies. Ton naturel, courtois, direct — comme un artisan sérieux qui répond à un client, pas comme un email marketing.

Ne donne aucun prix ni engagement ferme sur les délais si l'information n'est pas fournie explicitement.

Réponds uniquement avec le texte du message, sans guillemets, sans formule "Voici votre message :", rien d'autre que le texte prêt à copier.`;

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

  // Filtre organisation_id explicite en plus de la RLS : défense en
  // profondeur (relevé lors de l'audit du 12/08).
  const { data: projet, error: fetchError } = await supabase
    .from("demandes")
    .select("nom_client, description, informations_disponibles, questions_manquantes")
    .eq("id", demandeId)
    .eq("organisation_id", organisationId)
    .single();

  if (fetchError || !projet) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const messageUtilisateur = `Client : ${projet.nom_client}
Projet : "${projet.description}"
Informations disponibles : "${projet.informations_disponibles ?? "aucune"}"
${
  projet.questions_manquantes
    ? `Questions à poser au client : ${(projet.questions_manquantes.questions_suggerees ?? []).join(", ")}`
    : ""
}
${contexteSupplementaire ? `Contexte supplémentaire donné par l'artisan : "${contexteSupplementaire}"` : ""}`;

  try {
    const brouillon = await appelerClaude(SYSTEM_PROMPT, messageUtilisateur);

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "reponse_generee",
      contexte: demandeId,
    });

    return NextResponse.json({ brouillon: brouillon.trim() });
  } catch (err) {
    console.error(err);
    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "erreur_ia",
      contexte: demandeId,
      details: { etape: "reponse_client", erreur: String(err) },
    });
    return NextResponse.json(
      { error: "L'assistant IA n'a pas pu préparer de réponse. Réessayez." },
      { status: 502 }
    );
  }
}
