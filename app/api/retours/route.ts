import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appelerClaude, parserReponseJSON } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";
import { trouverCategorie, trouverSousCategorie, necessiteIA, typeDepuisCategorie } from "@/lib/retours/taxonomie";

// ============================================================
// La "carte mentale" (voir Module 15/16/20, supabase/schema.sql) :
// les artisans signalent problèmes/idées/bugs depuis le bouton "Faire un
// retour" toujours accessible dans l'app, notent l'importance (1-10), et
// choisissent une catégorie + sous-catégorie dans une liste fixe (voir
// lib/retours/taxonomie.ts).
//
// Refonte (retours v2) : avant, QUASIMENT chaque retour appelait Claude
// (nettoyage + rapprochement de thème). Désormais, un choix catégorie +
// sous-catégorie suffit à rattacher le retour à une bulle existante ou à en
// créer une nouvelle de façon 100% déterministe (upsert sur l'index unique
// (categorie, sous_categorie), voir Module 20) — ZÉRO appel IA pour 80 à
// 90% des retours. L'IA n'intervient plus que quand elle apporte une vraie
// valeur : catégorie/sous-catégorie "Autre", "Nouvelle idée", ou un texte
// libre assez long pour mériter un vrai résumé (voir necessiteIA()).
//
// GET  : liste agrégée par thème (comptage, importance moyenne, résumé IA),
//        ZÉRO donnée nominative. Public (pas d'auth requise) : /carte-
//        mentale est une page vitrine à part entière — seule l'écriture
//        (POST) exige d'être connecté. "monAvis" est simplement null pour
//        un visiteur non connecté.
// POST : trois cas —
//   A. probleme_id fourni : vote en un clic sur un thème existant, jamais
//      d'appel IA (inchangé depuis la version précédente).
//   B. categorie + sous_categorie connues, texte absent/court : chemin
//      déterministe, aucun appel IA.
//   C. catégorie/sous-catégorie "Autre", "Nouvelle idée", ou texte assez
//      long : l'IA nettoie le texte, détecte les doublons parmi TOUS les
//      thèmes existants (déterministes ou déjà créés par l'IA), et
//      résume le thème à jour.
// ============================================================

const SYSTEM_PROMPT_RAPPROCHEMENT = `Tu aides à organiser les retours d'artisans sur un logiciel appelé Compyo, pour construire une "carte mentale" des grands thèmes qui reviennent (ex: Planning, Devis, Appels, Photos, Mobile, IA, Import, Performance, Notifications...).

On te donne une liste de thèmes déjà connus (id, titre court, description, résumé actuel), la catégorie/sous-catégorie que l'artisan a lui-même choisie dans un menu (indicative, pas toujours exacte), et un nouveau témoignage écrit par l'artisan (avec son type : probleme / idee / bug).

Ta tâche, en un seul passage :
1. Décide si ce témoignage parle du MÊME thème de fond qu'un thème déjà listé (même si les mots sont différents), ou s'il s'agit d'un thème réellement nouveau. Sois raisonnablement strict : ne rapproche que si c'est vraiment le même sujet sous-jacent, pas juste la même catégorie générale (ex: "les devis prennent du temps à préparer" et "je ne peux pas dupliquer un ancien devis" sont deux sujets différents).
2. Nettoie le texte du témoignage : corrige les fautes évidentes et les hésitations, sans changer le sens, sans l'enjoliver, à la première personne comme l'a écrit l'artisan.
3. Rédige un résumé de thème à jour (2-3 phrases, neutre, troisième personne, jamais avec les mots exacts d'une personne énervée) qui tient compte de CE nouveau témoignage ET, si un thème existant correspond, de son résumé actuel — le résumé doit rester cohérent pour quelqu'un qui n'a lu ni les messages individuels ni l'ancien résumé.

Réponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "correspond_a_id": "<id exact d'un thème existant>" | null,
  "titre_propose": "<titre court et neutre du thème, 2 à 5 mots, ex: \\"Devis longs à corriger\\", ex: \\"Performance\\">",
  "texte_nettoye": "<texte du témoignage nettoyé>",
  "resume_ia": "<résumé de thème à jour, 2-3 phrases>"
}

"titre_propose" est toujours requis. S'il correspond à un thème existant, garde de préférence son titre actuel (ne le change que si le nouveau texte révèle qu'il était mal nommé).`;

// Sous-catégorie technique utilisée pour les bulles déterministes d'une
// catégorie qui n'a pas de sous-catégorie propre (ex: "Autre") ou quand
// l'artisan n'en a choisi aucune — l'index unique (categorie, sous_categorie)
// exige deux valeurs non nulles pour qu'un upsert reste idempotent (deux
// NULL ne sont jamais considérés égaux par Postgres).
const SOUS_CATEGORIE_GENERALE = "generale";

type ProblemeAgrege = {
  id: string;
  titre: string;
  description: string | null;
  resumeIa: string | null;
  categorie: string | null;
  nombreAvis: number;
  importanceMoyenne: number;
  monAvis: number | null;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Audit Cycle 2 (Agent Scalabilité) : cette route (publique, la plus
  // exposée du produit) chargeait TOUTE la table retours_produits en
  // mémoire pour agréger en JavaScript — O(thèmes × avis), intenable à
  // grande échelle. L'agrégation (comptage + moyenne) se fait en SQL via
  // retours_agreges() (voir Module 17, supabase/schema.sql).
  const admin = createAdminClient();

  const [
    { data: problemes, error: erreurProblemes },
    { data: agreges, error: erreurAgreges },
    { data: mesAvis, error: erreurMesAvis },
  ] = await Promise.all([
    admin
      .from("problemes_produits")
      .select("id, titre, description, resume_ia, categorie, created_at")
      .order("created_at", { ascending: true }),
    admin.rpc("retours_agreges"),
    // Bornée au nombre de thèmes (pas à la table entière) : uniquement les
    // avis DE l'utilisateur courant, pour afficher "monAvis" sans jamais
    // charger les avis des autres.
    user
      ? admin.from("retours_produits").select("probleme_id, importance").eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (erreurProblemes || erreurAgreges || erreurMesAvis) {
    console.error(erreurProblemes ?? erreurAgreges ?? erreurMesAvis);
    return NextResponse.json({ error: "Impossible de charger les retours" }, { status: 500 });
  }

  type LigneAgregee = { probleme_id: string; nombre_avis: number; importance_moyenne: number };
  const agregeParProbleme = new Map<string, LigneAgregee>(
    ((agreges ?? []) as LigneAgregee[]).map((a) => [a.probleme_id, a] as [string, LigneAgregee])
  );
  const monAvisParProbleme = new Map((mesAvis ?? []).map((a) => [a.probleme_id, a.importance]));

  const resultats: ProblemeAgrege[] = (problemes ?? []).map((p) => {
    const agrege = agregeParProbleme.get(p.id);
    const nombreAvis = agrege ? Number(agrege.nombre_avis) : 0;
    const importanceMoyenne = agrege ? Number(agrege.importance_moyenne) : 0;

    return {
      id: p.id,
      titre: p.titre,
      description: p.description,
      resumeIa: p.resume_ia ?? null,
      categorie: p.categorie ?? null,
      nombreAvis,
      importanceMoyenne: Math.round(importanceMoyenne * 10) / 10,
      monAvis: monAvisParProbleme.get(p.id) ?? null,
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
  const pieceJointeChemin: string | undefined = body.piece_jointe_chemin || undefined;
  const texteBrut: string | undefined =
    typeof body.texte === "string" && body.texte.trim().length > 0 ? body.texte.trim() : undefined;
  const categorieSlug: string | undefined = body.categorie || undefined;
  const sousCategorieSlug: string | undefined = body.sous_categorie || undefined;

  if (!Number.isInteger(importance) || importance < 1 || importance > 10) {
    return NextResponse.json({ error: "L'importance doit être un nombre entier entre 1 et 10" }, { status: 400 });
  }
  if (!problemeId && !categorieSlug) {
    return NextResponse.json(
      { error: "Précisez soit un thème existant (probleme_id), soit une catégorie" },
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

  // --- Catégorie/sous-catégorie requises à partir d'ici. ---
  const categorie = trouverCategorie(categorieSlug!);
  if (!categorie) {
    return NextResponse.json({ error: "Catégorie inconnue" }, { status: 400 });
  }

  const sousCategorie = sousCategorieSlug ? trouverSousCategorie(categorieSlug!, sousCategorieSlug) : undefined;
  if (categorie.sousCategories.length > 0 && !sousCategorie) {
    return NextResponse.json({ error: "Sous-catégorie inconnue" }, { status: 400 });
  }

  const type = typeDepuisCategorie(categorieSlug!);
  const aiRequise = necessiteIA(categorieSlug!, sousCategorie?.slug ?? null, texteBrut ?? null);

  // --- Cas B : chemin déterministe, AUCUN appel IA. ---
  // Couvre la grande majorité des retours : une catégorie et une
  // sous-catégorie connues suffisent à rattacher (ou créer, via upsert) une
  // bulle de la carte mentale, sans jamais appeler Claude.
  if (!aiRequise) {
    const clefSousCategorie = sousCategorie?.slug ?? SOUS_CATEGORIE_GENERALE;
    const titreBulle = sousCategorie ? `${categorie.label} · ${sousCategorie.label}` : categorie.label;

    const { data: bulle, error: erreurBulle } = await admin
      .from("problemes_produits")
      .upsert(
        { categorie: categorieSlug, sous_categorie: clefSousCategorie, titre: titreBulle },
        { onConflict: "categorie,sous_categorie" }
      )
      .select("id")
      .single();

    if (erreurBulle || !bulle) {
      console.error(erreurBulle);
      return NextResponse.json({ error: "Impossible d'enregistrer votre retour" }, { status: 500 });
    }

    const { error: erreurAvis } = await admin.from("retours_produits").upsert(
      {
        probleme_id: bulle.id,
        organisation_id: organisationId,
        user_id: user.id,
        importance,
        type,
        categorie: categorieSlug,
        sous_categorie: clefSousCategorie,
        commentaire: texteBrut ?? null,
        piece_jointe_chemin: pieceJointeChemin ?? null,
      },
      { onConflict: "probleme_id,user_id" }
    );

    if (erreurAvis) {
      console.error(erreurAvis);
      return NextResponse.json({ error: "Impossible d'enregistrer votre retour" }, { status: 500 });
    }

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "retour_produit",
      contexte: bulle.id,
      details: { action: "deterministe", categorie: categorieSlug, sous_categorie: clefSousCategorie, importance },
    });

    return NextResponse.json({ probleme_id: bulle.id });
  }

  // --- Cas C : "Autre" / "Nouvelle idée" / texte assez long — l'IA
  //     nettoie, résume et vérifie d'abord s'il s'agit déjà d'un thème
  //     connu (déterministe ou créé par l'IA) avant d'en créer un nouveau. ---
  const limite = await verifierLimiteIA(supabase, organisationId);
  if (!limite.autorise) {
    return NextResponse.json({ error: limite.message }, { status: 429 });
  }

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
  let texteNettoye = texteBrut!;

  try {
    const reponseTexte = await appelerClaude(
      SYSTEM_PROMPT_RAPPROCHEMENT,
      `Type de retour : ${type}\nCatégorie choisie par l'artisan : ${categorie.label}${sousCategorie ? ` > ${sousCategorie.label}` : ""}\n\nThèmes déjà connus :\n${listeExistants}\n\nNouveau témoignage d'un artisan :\n"${texteBrut}"`
    );
    const decision = parserReponseJSON<{
      correspond_a_id: string | null;
      titre_propose: string;
      texte_nettoye: string;
      resume_ia: string;
    }>(reponseTexte);

    texteNettoye = decision.texte_nettoye?.trim() || texteBrut!;

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
      // Nouveau thème "libre" : categorie renseignée à titre indicatif,
      // sous_categorie volontairement laissée à NULL — ce n'est pas une
      // bulle déterministe, donc elle ne doit jamais entrer en collision
      // avec l'index unique (categorie, sous_categorie) des bulles fixes
      // (Postgres ne considère jamais deux NULL comme égaux).
      //
      // Passe par une fonction SQL (Module 22, supabase/schema.sql) plutôt
      // qu'un insert direct : elle vérifie et insère en une seule opération
      // atomique côté base, pour fermer (au moins pour un titre identique)
      // la fenêtre de course entre deux artisans qui remontent le même
      // sujet à quelques secondes d'écart pendant que l'IA répond.
      const titreLibre = decision.titre_propose?.slice(0, 140) || texteBrut!.slice(0, 80);
      const { data: probleme, error: erreurCreation } = await admin
        .rpc("creer_theme_produit_libre", {
          p_categorie: categorieSlug,
          p_titre: titreLibre,
          p_description: texteBrut,
          p_resume_ia: decision.resume_ia?.trim() || null,
        })
        .single();

      if (erreurCreation || !probleme) {
        throw new Error(erreurCreation?.message ?? "Échec de création du thème");
      }
      probleteIdFinal = (probleme as { id: string }).id;
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
      categorie: categorieSlug,
      sous_categorie: sousCategorie?.slug ?? null,
      commentaire: texteNettoye,
      texte_original: texteBrut,
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
    details: { action: "nouveau_texte_ia", importance, type_retour: type, categorie: categorieSlug },
  });

  return NextResponse.json({ probleme_id: probleteIdFinal });
}
