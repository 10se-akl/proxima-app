import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appelerClaude, parserReponseJSON } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";

// ============================================================
// La "carte mentale" (voir Module 15 + Module 16, supabase/schema.sql) :
// les artisans signalent problèmes/idées/améliorations/bugs depuis le
// bouton "Faire un retour" toujours accessible dans l'app, notent
// l'importance (1-10), et l'IA regroupe automatiquement en grands thèmes.
//
// GET  : liste agrégée par thème (comptage, importance moyenne, résumé IA),
//        ZÉRO donnée nominative. Volontairement PUBLIC (pas d'auth requise)
//        depuis la refonte Module 16 : /carte-mentale est une page
//        vitrine à part entière, visible sans connexion — seule
//        l'écriture (POST) exige d'être connecté. "monAvis" est simplement
//        null pour un visiteur non connecté.
// POST : un artisan connecté vote sur un thème existant (probleme_id, en un
//        clic, sans texte) OU décrit un nouveau retour en texte libre
//        (texte + type) — dans ce second cas, l'IA nettoie le texte, écrit
//        un résumé du thème à jour, et vérifie d'abord s'il s'agit déjà
//        d'un thème connu avant d'en créer un nouveau.
// ============================================================

const TYPES_VALIDES = ["probleme", "idee", "amelioration", "bug"] as const;
type TypeRetour = (typeof TYPES_VALIDES)[number];

const SYSTEM_PROMPT_RAPPROCHEMENT = `Tu aides à organiser les retours d'artisans sur un logiciel appelé Compyo, pour construire une "carte mentale" des grands thèmes qui reviennent (ex: Planning, Devis, Appels, Photos, Mobile, IA, Import, Performance, Notifications...).

On te donne une liste de thèmes déjà connus (id, titre court, description, résumé actuel), et un nouveau témoignage écrit par un artisan (avec son type : probleme / idee / amelioration / bug).

Ta tâche, en un seul passage :
1. Décide si ce témoignage parle du MÊME thème de fond qu'un thème déjà listé (même si les mots sont différents), ou s'il s'agit d'un thème réellement nouveau. Sois raisonnablement strict : ne rapproche que si c'est vraiment le même sujet sous-jacent, pas juste le même thème général (ex: "les devis prennent du temps à préparer" et "je ne peux pas dupliquer un ancien devis" sont deux sujets différents).
2. Nettoie le texte du témoignage : corrige les fautes évidentes et les hésitations de dictée, sans changer le sens, sans l'enjoliver, à la première personne comme l'a écrit l'artisan.
3. Rédige un résumé de thème à jour (2-3 phrases, neutre, troisième personne, jamais avec les mots exacts d'une personne énervée) qui tient compte de CE nouveau témoignage ET, si un thème existant correspond, de son résumé actuel — le résumé doit rester cohérent pour quelqu'un qui n'a lu ni les messages individuels ni l'ancien résumé.

Réponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "correspond_a_id": "<id exact d'un thème existant>" | null,
  "titre_propose": "<titre court et neutre du thème, 2 à 5 mots, ex: \\"Devis longs à corriger\\", ex: \\"Performance\\">",
  "texte_nettoye": "<texte du témoignage nettoyé>",
  "resume_ia": "<résumé de thème à jour, 2-3 phrases>"
}

"titre_propose" est toujours requis. S'il correspond à un thème existant, garde de préférence son titre actuel (ne le change que si le nouveau texte révèle qu'il était mal nommé).`;

type ProblemeAgrege = {
  id: string;
  titre: string;
  description: string | null;
  resumeIa: string | null;
  nombreAvis: number;
  importanceMoyenne: number;
  monAvis: number | null;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Client admin nécessaire ici : on doit lire TOUS les avis (toutes
  // organisations confondues, volontairement transversal) pour les
  // compter, sans jamais renvoyer de donnée nominative plus bas.
  const admin = createAdminClient();

  const [{ data: problemes, error: erreurProblemes }, { data: avis, error: erreurAvis }] =
    await Promise.all([
      admin
        .from("problemes_produits")
        .select("id, titre, description, resume_ia, created_at")
        .order("created_at", { ascending: true }),
      admin.from("retours_produits").select("probleme_id, user_id, importance"),
    ]);

  if (erreurProblemes || erreurAvis) {
    console.error(erreurProblemes ?? erreurAvis);
    return NextResponse.json({ error: "Impossible de charger les retours" }, { status: 500 });
  }

  const resultats: ProblemeAgrege[] = (problemes ?? []).map((p) => {
    const avisDuProbleme = (avis ?? []).filter((a) => a.probleme_id === p.id);
    const nombreAvis = avisDuProbleme.length;
    const importanceMoyenne =
      nombreAvis > 0
        ? avisDuProbleme.reduce((somme, a) => somme + a.importance, 0) / nombreAvis
        : 0;
    const monAvisTrouve = user ? avisDuProbleme.find((a) => a.user_id === user.id) : undefined;

    return {
      id: p.id,
      titre: p.titre,
      description: p.description,
      resumeIa: p.resume_ia ?? null,
      nombreAvis,
      importanceMoyenne: Math.round(importanceMoyenne * 10) / 10,
      monAvis: monAvisTrouve ? monAvisTrouve.importance : null,
    };
  });

  // Trié par "score" (popularité × gravité perçue) décroissant.
  resultats.sort((a, b) => b.nombreAvis * b.importanceMoyenne - a.nombreAvis * a.importanceMoyenne);

  return NextResponse.json({ problemes: resultats });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const importance = Number(body.importance);
  const problemeId: string | undefined = body.probleme_id || undefined;
  const texte: string | undefined = body.texte?.trim() || undefined;
  const pieceJointeChemin: string | undefined = body.piece_jointe_chemin || undefined;
  const typeDemande = (body.type as string) || "probleme";
  const type: TypeRetour = TYPES_VALIDES.includes(typeDemande as TypeRetour)
    ? (typeDemande as TypeRetour)
    : "probleme";

  if (!Number.isInteger(importance) || importance < 1 || importance > 10) {
    return NextResponse.json({ error: "L'importance doit être un nombre entier entre 1 et 10" }, { status: 400 });
  }
  if (!problemeId && !texte) {
    return NextResponse.json(
      { error: "Précisez soit un thème existant (probleme_id), soit un nouveau texte (texte)" },
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

  const admin = createAdminClient();

  // --- Cas A : vote en un clic sur un thème déjà existant, pas d'appel IA. ---
  if (problemeId) {
    const { data: probleme } = await admin
      .from("problemes_produits")
      .select("id")
      .eq("id", problemeId)
      .maybeSingle();

    if (!probleme) {
      return NextResponse.json({ error: "Ce thème n'existe pas ou plus" }, { status: 404 });
    }

    const { error: erreurUpsert } = await admin.from("retours_produits").upsert(
      {
        probleme_id: problemeId,
        organisation_id: organisationId,
        user_id: user.id,
        importance,
        type,
        piece_jointe_chemin: pieceJointeChemin ?? null,
      },
      { onConflict: "probleme_id,user_id" }
    );

    if (erreurUpsert) {
      console.error(erreurUpsert);
      return NextResponse.json({ error: "Impossible d'enregistrer votre avis" }, { status: 500 });
    }

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "retour_produit",
      contexte: problemeId,
      details: { action: "vote_existant", importance },
    });

    return NextResponse.json({ probleme_id: problemeId });
  }

  // --- Cas B : nouveau texte libre — l'IA nettoie, résume et vérifie
  //     d'abord s'il s'agit déjà d'un thème connu avant d'en créer un. ---
  const { data: problemesExistants } = await admin
    .from("problemes_produits")
    .select("id, titre, description, resume_ia");

  const listeExistants =
    (problemesExistants ?? [])
      .map(
        (p) =>
          `- id: ${p.id} | titre: "${p.titre}"${p.description ? ` | description: "${p.description}"` : ""}${p.resume_ia ? ` | résumé actuel: "${p.resume_ia}"` : ""}`
      )
      .join("\n") || "(aucun thème connu pour l'instant)";

  let probleteIdFinal: string;
  let texteNettoye = texte!;

  try {
    const reponseTexte = await appelerClaude(
      SYSTEM_PROMPT_RAPPROCHEMENT,
      `Type de retour : ${type}\n\nThèmes déjà connus :\n${listeExistants}\n\nNouveau témoignage d'un artisan :\n"${texte}"`
    );
    const decision = parserReponseJSON<{
      correspond_a_id: string | null;
      titre_propose: string;
      texte_nettoye: string;
      resume_ia: string;
    }>(reponseTexte);

    texteNettoye = decision.texte_nettoye?.trim() || texte!;

    const correspondanceValide =
      decision.correspond_a_id &&
      (problemesExistants ?? []).some((p) => p.id === decision.correspond_a_id);

    if (correspondanceValide && decision.correspond_a_id) {
      probleteIdFinal = decision.correspond_a_id;
      await admin
        .from("problemes_produits")
        .update({ resume_ia: decision.resume_ia?.trim() || null })
        .eq("id", probleteIdFinal);
    } else {
      const { data: nouveauProbleme, error: erreurCreation } = await admin
        .from("problemes_produits")
        .insert({
          titre: decision.titre_propose?.slice(0, 140) || texte!.slice(0, 80),
          description: texte,
          resume_ia: decision.resume_ia?.trim() || null,
        })
        .select("id")
        .single();

      if (erreurCreation || !nouveauProbleme) {
        throw new Error(erreurCreation?.message ?? "Échec de création du thème");
      }
      probleteIdFinal = nouveauProbleme.id;
    }
  } catch (err) {
    console.error(err);
    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "erreur_ia",
      contexte: "retour_produit",
      details: { etape: "rapprochement", erreur: String(err) },
    });
    return NextResponse.json(
      { error: "Impossible d'analyser votre retour pour l'instant. Réessayez." },
      { status: 502 }
    );
  }

  const { error: erreurUpsert } = await admin.from("retours_produits").upsert(
    {
      probleme_id: probleteIdFinal,
      organisation_id: organisationId,
      user_id: user.id,
      importance,
      type,
      commentaire: texteNettoye,
      texte_original: texte,
      texte_nettoye: texteNettoye,
      piece_jointe_chemin: pieceJointeChemin ?? null,
    },
    { onConflict: "probleme_id,user_id" }
  );

  if (erreurUpsert) {
    console.error(erreurUpsert);
    return NextResponse.json({ error: "Impossible d'enregistrer votre avis" }, { status: 500 });
  }

  await enregistrerLog(supabase, {
    artisanId: user.id,
    organisationId,
    type: "retour_produit",
    contexte: probleteIdFinal,
    details: { action: "nouveau_texte", importance, type_retour: type },
  });

  return NextResponse.json({ probleme_id: probleteIdFinal });
}
