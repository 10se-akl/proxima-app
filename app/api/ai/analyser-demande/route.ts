import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude, parserReponseJSON } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import type { AnalyseIA } from "@/types";

const SYSTEM_PROMPT = `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment (maçons, plombiers, électriciens, chauffagistes, couvreurs).

Un artisan te transmet toutes les informations qu'il a accumulées sur un projet : la description initiale, ses notes libres, et des notes vocales dictées sur le terrain (donc parfois désordonnées, avec des hésitations ou des remarques sans rapport avec le chantier).

Ton rôle :
1. Fais la synthèse de TOUT ce qui est fourni en un résumé clair et structuré.
2. Ne retiens QUE ce qui concerne réellement le chantier (mesures, matériaux, contraintes, préférences du client, délais...). Ignore les remarques hors sujet, les répétitions, les hésitations de dictée vocale.
3. Identifie ensuite ce qui manque encore pour préparer un devis sérieux.

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte :
{
  "resume": "synthèse claire et structurée de tout ce qui est utile au chantier, 2 à 4 phrases",
  "informations_manquantes": ["liste courte des informations techniques manquantes"],
  "questions_suggerees": ["questions concrètes à poser au client, formulées comme l'artisan les poserait"]
}

Reste concret et orienté métier du bâtiment. Ne propose jamais de prix à ce stade.`;

export async function POST(request: NextRequest) {
  const { demandeId } = await request.json();

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

  // Voir Module 14 (supabase/schema.sql) : accès désormais scopé par
  // organisation, pas par artisan exact — un coéquipier doit pouvoir
  // analyser un projet créé par un autre membre de son équipe.
  const organisationId = await getOrganisationId(supabase, user.id);
  if (!organisationId) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }

  // RLS s'applique aussi côté serveur avec le client Supabase authentifié :
  // impossible de récupérer le projet d'une autre organisation ici.
  // Les deux requêtes sont indépendantes (aucune ne dépend de l'autre) :
  // lancées en parallèle plutôt qu'en chaîne.
  const [{ data: projet, error: fetchError }, { data: notesVocales }] = await Promise.all([
    supabase
      .from("demandes")
      .select(
        "description, informations_disponibles, notes, questions_manquantes, derniere_modification_le, derniere_analyse_le"
      )
      .eq("id", demandeId)
      // Filtre organisation_id explicite en plus de la RLS : défense en
      // profondeur (relevé lors de l'audit du 12/08).
      .eq("organisation_id", organisationId)
      .single(),
    supabase
      .from("notes_vocales")
      .select("transcription, created_at")
      .eq("demande_id", demandeId)
      .order("created_at", { ascending: true }),
  ]);

  if (fetchError || !projet) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Cette étape sert UNIQUEMENT à mettre de l'ordre dans des notes déjà
  // accumulées (notes libres, notes vocales, message client importé) — pas
  // à reformuler la simple description initiale du projet. Sans rien de
  // plus que la description, l'IA n'aurait que ça à "résumer" : un appel
  // gaspillé, pour un résultat qui ne fait que répéter ce que l'artisan a
  // déjà écrit lui-même. On bloque avant d'appeler Claude.
  const aDuContenuAAnalyser =
    Boolean(projet.notes?.trim()) ||
    Boolean(projet.informations_disponibles?.trim()) ||
    (notesVocales?.length ?? 0) > 0;

  if (!aDuContenuAAnalyser) {
    return NextResponse.json(
      {
        error:
          "Rien à analyser pour l'instant : ajoutez une note (vocale ou écrite) après votre visite, puis relancez l'analyse.",
      },
      { status: 400 }
    );
  }

  // Une analyse existe déjà et rien n'a changé depuis (aucune note, photo
  // ou modification depuis) : relancer l'IA ne produirait rien de neuf, ce
  // serait juste un appel gaspillé. Même vérification que côté interface
  // (peutAnalyser), refaite ici pour ne pas dépendre uniquement du bouton
  // désactivé côté client.
  if (
    projet.questions_manquantes &&
    projet.derniere_analyse_le &&
    (!projet.derniere_modification_le ||
      new Date(projet.derniere_modification_le) <= new Date(projet.derniere_analyse_le))
  ) {
    return NextResponse.json(
      {
        error:
          "Rien de nouveau depuis la dernière analyse — ajoutez une note pour pouvoir la relancer.",
      },
      { status: 400 }
    );
  }

  const blocNotesVocales = (notesVocales ?? [])
    .map((n, i) => `Note vocale ${i + 1} : "${n.transcription}"`)
    .join("\n");

  const messageUtilisateur = `Description transmise par l'artisan : "${projet.description}"
Informations déjà disponibles : "${projet.informations_disponibles ?? "aucune"}"
Notes libres de l'artisan : "${projet.notes ?? "aucune"}"
${blocNotesVocales ? `\nNotes vocales dictées sur le terrain :\n${blocNotesVocales}` : ""}`;

  try {
    const reponseTexte = await appelerClaude(SYSTEM_PROMPT, messageUtilisateur);
    const analyse = parserReponseJSON<AnalyseIA>(reponseTexte);

    // Horodate cette analyse pour pouvoir détecter, la prochaine fois,
    // qu'aucune note n'a été ajoutée depuis — voir peutAnalyser côté
    // interface, qui compare cette date à derniere_modification_le.
    const { error: updateError } = await supabase
      .from("demandes")
      .update({
        questions_manquantes: analyse,
        statut: "analyse",
        derniere_analyse_le: new Date().toISOString(),
      })
      .eq("id", demandeId)
      .eq("organisation_id", organisationId);

    if (updateError) {
      await enregistrerLog(supabase, {
        artisanId: user.id,
        organisationId,
        type: "erreur_ia",
        contexte: demandeId,
        details: { etape: "analyse", erreur: "echec_enregistrement" },
      });
      return NextResponse.json(
        { error: "Analyse générée mais non enregistrée" },
        { status: 500 }
      );
    }

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "analyse_ia",
      contexte: demandeId,
      details: {
        informations_manquantes: analyse.informations_manquantes.length,
        notes_vocales_incluses: notesVocales?.length ?? 0,
      },
    });

    return NextResponse.json({ analyse });
  } catch (err) {
    console.error(err);
    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "erreur_ia",
      contexte: demandeId,
      details: { etape: "analyse", erreur: String(err) },
    });
    return NextResponse.json(
      { error: "L'assistant IA n'a pas pu analyser cette demande. Réessayez." },
      { status: 502 }
    );
  }
}
