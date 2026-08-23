import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appelerClaude, parserReponseJSON } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";

// ============================================================
// La "carte des problèmes" (voir Module 15, supabase/schema.sql) : les
// artisans connectés signalent ce qui leur pose problème dans Compyo,
// notent l'importance (1-10), et voient les problèmes déjà remontés par
// d'autres — sans jamais voir QUI les a remontés (voir plus bas, GET).
//
// GET  : liste agrégée (comptage + moyenne d'importance), zéro donnée
//        nominative, calculée ici en TypeScript plutôt que par une vue
//        SQL — plus simple à vérifier correcte sans pouvoir tester une
//        policy RLS-sur-vue en direct dans mon environnement.
// POST : un artisan vote sur un problème existant (probleme_id) OU décrit
//        un nouveau problème en texte libre (texte) — dans ce second cas,
//        l'IA compare d'abord ce texte à la liste des problèmes déjà
//        connus pour éviter de créer un doublon à chaque reformulation
//        légèrement différente du même problème.
// ============================================================

const SYSTEM_PROMPT_RAPPROCHEMENT = `Tu aides à organiser les retours d'artisans sur un logiciel appelé Compyo.

On te donne une liste de problèmes déjà connus (chacun avec un id, un titre court, et parfois une description), et un nouveau témoignage écrit par un artisan.

Ta tâche : décider si ce témoignage parle du MÊME problème de fond qu'un des problèmes déjà listés (même si les mots sont différents), ou s'il s'agit d'un problème réellement nouveau.

Sois raisonnablement strict : ne rapproche que si c'est vraiment le même problème sous-jacent, pas juste le même thème général (ex: "les devis prennent du temps à préparer" et "je ne peux pas dupliquer un ancien devis" sont deux problèmes différents, même si les deux parlent de devis).

Réponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "correspond_a_id": "<id exact d'un problème existant>" | null,
  "titre_propose": "<titre court et neutre du problème, 4 à 10 mots, à la troisième personne, ex: \\"Les devis sont longs à corriger\\">"
}

"titre_propose" est toujours requis, même si "correspond_a_id" n'est pas null (il sera simplement ignoré dans ce cas). Reformule toujours le titre de façon neutre et factuelle, jamais avec les mots exacts d'une personne énervée — ce titre sera visible par d'autres artisans.`;

type ProblemeAgrege = {
  id: string;
  titre: string;
  description: string | null;
  nombreAvis: number;
  importanceMoyenne: number;
  monAvis: number | null;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Client admin nécessaire ici : on doit lire TOUS les avis (toutes
  // organisations confondues, c'est volontairement transversal, voir le
  // commentaire du Module 15) pour les compter, alors que la policy RLS
  // sur "retours_produits" limite un artisan à sa propre ligne. Aucune
  // donnée nominative n'est renvoyée plus bas : seuls id/titre/
  // description/compte/moyenne quittent cette route.
  const admin = createAdminClient();

  const [{ data: problemes, error: erreurProblemes }, { data: avis, error: erreurAvis }] =
    await Promise.all([
      admin
        .from("problemes_produits")
        .select("id, titre, description, created_at")
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
    const monAvisTrouve = avisDuProbleme.find((a) => a.user_id === user.id);

    return {
      id: p.id,
      titre: p.titre,
      description: p.description,
      nombreAvis,
      importanceMoyenne: Math.round(importanceMoyenne * 10) / 10,
      monAvis: monAvisTrouve ? monAvisTrouve.importance : null,
    };
  });

  // Trié par "score" (popularité × gravité perçue) décroissant : ce qui
  // revient le plus souvent ET compte le plus pour les gens remonte en
  // premier — plus utile pour prioriser qu'un simple tri par date.
  resultats.sort((a, b) => b.nombreAvis * b.importanceMoyenne - a.nombreAvis * a.importanceMoyenne);

  return NextResponse.json({ problemes: resultats });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const importance = Number(body.importance);
  const problemeId: string | undefined = body.probleme_id || undefined;
  const texte: string | undefined = body.texte?.trim() || undefined;

  if (!Number.isInteger(importance) || importance < 1 || importance > 10) {
    return NextResponse.json({ error: "L'importance doit être un nombre entier entre 1 et 10" }, { status: 400 });
  }
  if (!problemeId && !texte) {
    return NextResponse.json(
      { error: "Précisez soit un problème existant (probleme_id), soit un nouveau texte (texte)" },
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

  // --- Cas A : vote sur un problème déjà existant, pas d'appel IA. ---
  if (problemeId) {
    const { data: probleme } = await admin
      .from("problemes_produits")
      .select("id")
      .eq("id", problemeId)
      .maybeSingle();

    if (!probleme) {
      return NextResponse.json({ error: "Ce problème n'existe pas ou plus" }, { status: 404 });
    }

    const { error: erreurUpsert } = await admin.from("retours_produits").upsert(
      {
        probleme_id: problemeId,
        organisation_id: organisationId,
        user_id: user.id,
        importance,
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

  // --- Cas B : nouveau texte libre — l'IA vérifie d'abord s'il s'agit
  //     déjà d'un problème connu avant d'en créer un nouveau. ---
  const { data: problemesExistants } = await admin
    .from("problemes_produits")
    .select("id, titre, description");

  const listeExistants =
    (problemesExistants ?? [])
      .map((p) => `- id: ${p.id} | titre: "${p.titre}"${p.description ? ` | description: "${p.description}"` : ""}`)
      .join("\n") || "(aucun problème connu pour l'instant)";

  let probleteIdFinal: string;

  try {
    const reponseTexte = await appelerClaude(
      SYSTEM_PROMPT_RAPPROCHEMENT,
      `Problèmes déjà connus :\n${listeExistants}\n\nNouveau témoignage d'un artisan :\n"${texte}"`
    );
    const decision = parserReponseJSON<{ correspond_a_id: string | null; titre_propose: string }>(
      reponseTexte
    );

    const correspondanceValide =
      decision.correspond_a_id &&
      (problemesExistants ?? []).some((p) => p.id === decision.correspond_a_id);

    if (correspondanceValide && decision.correspond_a_id) {
      probleteIdFinal = decision.correspond_a_id;
    } else {
      const { data: nouveauProbleme, error: erreurCreation } = await admin
        .from("problemes_produits")
        .insert({
          titre: decision.titre_propose?.slice(0, 140) || texte!.slice(0, 80),
          description: texte,
        })
        .select("id")
        .single();

      if (erreurCreation || !nouveauProbleme) {
        throw new Error(erreurCreation?.message ?? "Échec de création du problème");
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
      commentaire: texte,
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
    details: { action: "nouveau_texte", importance },
  });

  return NextResponse.json({ probleme_id: probleteIdFinal });
}
