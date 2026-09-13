import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude, parserReponseJSON, ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";
import { listerNotesActivesProjet, formaterNotesPourPromptIA } from "@/lib/notes";
import type { AnalyseIA } from "@/types";

// Même plafond que l'ancienne interprétation note par note : au-delà, ce
// n'est plus une liste de tâches mais un second résumé. Déclaré AVANT le
// prompt, qui l'interpole à l'évaluation du module.
const MAX_TACHES = 5;

const SYSTEM_PROMPT = `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment (maçons, plombiers, électriciens, chauffagistes, couvreurs).

Un artisan te transmet toutes les informations qu'il a accumulées sur un projet : la description initiale, ses notes libres, des notes vocales dictées sur le terrain (donc parfois désordonnées, avec des hésitations ou des remarques sans rapport avec le chantier), et des notes structurées qu'il a explicitement enregistrées pour ce projet (pense-bêtes, consignes, informations client, remarques techniques). Ces notes structurées sont des rappels que l'artisan s'est donnés à lui-même : elles doivent influencer ton résumé quand elles concernent le chantier.

Ton rôle :
1. Fais la synthèse de TOUT ce qui est fourni en un résumé clair et structuré.
2. Ne retiens QUE ce qui concerne réellement le chantier (mesures, matériaux, contraintes, préférences du client, délais...). Ignore les remarques hors sujet, les répétitions, les hésitations de dictée vocale.
3. Identifie ensuite ce qui manque encore pour préparer un devis sérieux.
4. Dresse la liste des tâches qui restent à faire sur ce chantier, en tenant compte de TOUTES les notes vocales ensemble : si une note plus récente indique qu'une tâche est faite, ne la liste plus. Dédoublonne : deux dictées qui décrivent la même tâche ne donnent qu'une seule ligne.
5. Dis si ce chantier doit être traité en priorité.

L'artisan te lit sur un téléphone, souvent debout sur un chantier, entre deux tâches. Il ne lira pas un pavé : sois BREF. Mieux vaut trois lignes qu'il lit vraiment que dix qu'il saute.

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte :
{
  "resume": "l'essentiel du chantier en 2 phrases MAXIMUM, comme si tu le résumais à voix haute à un collègue en quinze secondes",
  "informations_manquantes": ["4 éléments MAXIMUM, uniquement ceux qui EMPÊCHENT vraiment de chiffrer le devis — pas tout ce qu'il serait agréable de savoir. Quelques mots chacun, pas une phrase"],
  "questions_suggerees": ["4 questions MAXIMUM, les plus utiles à poser au client, une ligne chacune"],
  "taches_restantes": ["tâches courtes et concrètes qui restent à faire, 0 à ${MAX_TACHES} maximum, liste vide si rien"],
  "urgence_detectee": true ou false,
  "chantier_semble_termine": true ou false
}

Règles pour les trois derniers champs :
- "taches_restantes" : des actions concrètes de chantier, formulées en 5 MOTS MAXIMUM chacune ("poser le receveur", "commander la robinetterie") — jamais une phrase, jamais une reformulation du projet entier.
- "urgence_detectee" : vrai UNIQUEMENT si les notes indiquent clairement que ce chantier doit passer en priorité (le client insiste explicitement, la situation s'aggrave, conséquence financière ou de sécurité liée à la rapidité d'intervention). Faux par défaut, y compris en cas de doute.
- "chantier_semble_termine" : vrai UNIQUEMENT si les notes les plus récentes indiquent clairement que l'intervention est terminée, pas juste une étape franchie. En cas de doute, réponds false.

Reste concret et orienté métier du bâtiment. Ne propose jamais de prix à ce stade.`;

// Sprint Beta Final (27/08) — voir même commentaire dans preparer-brouillon.
export const maxDuration = 60;

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

  const limite = await verifierLimiteIA(supabase, organisationId);
  if (!limite.autorise) {
    return NextResponse.json({ error: limite.message }, { status: 429 });
  }

  // RLS s'applique aussi côté serveur avec le client Supabase authentifié :
  // impossible de récupérer le projet d'une autre organisation ici.
  // Les deux requêtes sont indépendantes (aucune ne dépend de l'autre) :
  // lancées en parallèle plutôt qu'en chaîne.
  const [{ data: projet, error: fetchError }, { data: notesVocales }, notesActives] = await Promise.all([
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
    // Notes professionnelles actives (29/08, point 4 du brief) — jamais
    // les notes déjà terminées, voir lib/notes/index.ts.
    listerNotesActivesProjet(supabase, demandeId),
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
    (notesVocales?.length ?? 0) > 0 ||
    notesActives.length > 0;

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
${blocNotesVocales ? `\nNotes vocales dictées sur le terrain :\n${blocNotesVocales}` : ""}
Notes importantes enregistrées par l'artisan pour ce projet :
${formaterNotesPourPromptIA(notesActives)}`;

  const debutAppel = Date.now();
  try {
    const reponseTexte = await appelerClaude(SYSTEM_PROMPT, messageUtilisateur, request.signal);
    // taches_restantes/urgence_detectee ne font pas partie d'AnalyseIA :
    // ils ne sont pas enregistrés en base avec l'analyse, ils sont renvoyés
    // à l'interface pour traitement immédiat (voir plus bas).
    const brut = parserReponseJSON<
      Partial<AnalyseIA> & {
        taches_restantes?: unknown;
        urgence_detectee?: unknown;
        chantier_semble_termine?: unknown;
      }
    >(reponseTexte);

    // Un JSON valide mais avec un résumé vide reste un résultat inexploitable
    // — l'artisan verrait un résumé blanc sans explication. Traité comme un
    // échec plutôt qu'enregistré tel quel (relevé à l'audit IA du 25/08).
    if (!brut.resume?.trim()) {
      return NextResponse.json(
        { error: "L'IA n'a pas pu résumer ce projet. Réessayez." },
        { status: 502 }
      );
    }

    // Normalisation défensive (06/09) — bug trouvé en relecture avant tout
    // premier test réel : si "informations_manquantes" ou
    // "questions_suggerees" manquait ou n'était pas un tableau, l'objet
    // était quand même enregistré tel quel en base (questions_manquantes),
    // puis TOUT rendu de la fiche projet plantait au premier .map()/.length
    // sur ce champ (app/dashboard/demandes/[id]/page.tsx) — un vrai crash
    // d'écran, pas juste un message d'erreur. On force ici la forme
    // attendue une bonne fois, avant toute écriture en base.
    const analyse: AnalyseIA = {
      resume: brut.resume.trim(),
      informations_manquantes: Array.isArray(brut.informations_manquantes)
        ? brut.informations_manquantes.filter(
            (i): i is string => typeof i === "string" && i.trim().length > 0
          )
        : [],
      questions_suggerees: Array.isArray(brut.questions_suggerees)
        ? brut.questions_suggerees.filter(
            (q): q is string => typeof q === "string" && q.trim().length > 0
          )
        : [],
    };

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

    // Tâches restantes et urgence (13/09) — extraites ICI désormais, et
    // plus à chaque note vocale enregistrée (voir components/dashboard/
    // NotesVocales.tsx). Un artisan qui dicte quatre comptes-rendus sur un
    // chantier déclenchait quatre appels IA et se retrouvait avec quatre
    // notes "Tâches restantes", dont des doublons mot pour mot. Un seul
    // appel, au moment où l'artisan demande explicitement l'analyse, coûte
    // quatre fois moins cher ET donne un meilleur résultat : l'IA voit
    // toutes les notes ensemble, donc elle peut dédoublonner et retirer ce
    // qui a été fait entre-temps.
    //
    // Volontairement hors de l'objet "analyse" enregistré en base : ces
    // deux champs ne sont pas un résultat d'analyse à conserver, mais des
    // propositions à traiter tout de suite côté interface (créer la note,
    // proposer le passage en urgent) — l'artisan restant seul à valider.
    const tachesRestantes = Array.isArray(brut.taches_restantes)
      ? brut.taches_restantes
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .map((t) => t.trim())
          .slice(0, MAX_TACHES)
      : [];
    const urgenceDetectee = brut.urgence_detectee === true;
    // Alimente la détection "chantier probablement terminé" du tableau de
    // bord (voir app/dashboard/page.tsx) : elle se nourrissait jusqu'ici de
    // l'interprétation note par note, désormais supprimée. Le seuil de deux
    // signaux consécutifs y garde tout son sens, appliqué à deux analyses
    // successives plutôt qu'à deux dictées.
    const chantierSembleTermine = brut.chantier_semble_termine === true;

    return NextResponse.json({
      analyse,
      tachesRestantes,
      urgenceDetectee,
      chantierSembleTermine,
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
        etape: "analyse",
        erreur: String(err),
        code: err instanceof ErreurIA ? err.code : undefined,
        duree_ms: dureeMs,
      },
    });
    return NextResponse.json({ error: message }, { status: statut });
  }
}
