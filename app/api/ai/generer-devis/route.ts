import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude, parserReponseJSON, ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { calculerDevis, PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";
import { obtenirChecklist } from "@/lib/checklistsMetier";
import { listerNotesActivesProjet, formaterNotesPourPromptIA } from "@/lib/notes";
import type { PosteTravailIA, ParametresEntreprise, LigneDevisCalculee } from "@/types";

// Anti-oubli (06/09) — validation partagée entre "postes" (bloquant si
// invalide, voir plus bas) et "postes_oublies_probables" (filtré
// silencieusement si invalide : c'est une suggestion annexe, un item mal
// formé ne doit jamais faire échouer la génération du devis principal).
function posteEstValide(p: PosteTravailIA): boolean {
  // Un élément null/non-objet dans le tableau (JSON malformé renvoyé par
  // l'IA) ne doit jamais faire planter cette vérification — juste être
  // traité comme invalide, comme n'importe quel autre poste mal formé.
  if (!p || typeof p !== "object") return false;
  const categorieValide = ["main_oeuvre", "fourniture", "forfait"].includes(p.categorie);
  const quantite = p.categorie === "main_oeuvre" ? (p.temps_estime_heures ?? p.quantite) : p.quantite;
  const quantiteValide = typeof quantite === "number" && Number.isFinite(quantite) && quantite > 0;
  const descriptionValide = typeof p.description === "string" && p.description.trim().length > 0;
  return categorieValide && quantiteValide && descriptionValide;
}

// Nombre max de suggestions affichées à l'artisan — au-delà, ce n'est plus
// une aide ciblée mais une liste qui noie l'attention (voir spec produit).
const MAX_SUGGESTIONS_OUBLIS = 4;

// L'IA ne produit QUE des postes de travaux, jamais de prix. Le calcul
// financier appartient entièrement au moteur métier (voir
// lib/moteur-metier/calculerDevis.ts). C'est une contrainte d'architecture,
// pas un détail : elle garantit que deux artisans avec les mêmes postes
// mais des paramètres différents obtiennent des devis différents et
// justifiables, jamais une estimation "inventée" par le modèle de langage.
const SYSTEM_PROMPT = `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

À partir d'un projet déjà cadré, identifie la liste des postes de travaux nécessaires.

RÈGLE ABSOLUE : tu ne dois JAMAIS indiquer de prix, de montant en euros, ou de coût. Ce n'est pas ton rôle. Un système séparé calcule les prix à partir de ces postes.

En plus de cette liste principale, identifie séparément les postes ADDITIONNELS probablement nécessaires mais absents de ta première liste — des oublis fréquents qui coûtent de l'argent à l'artisan s'ils ne sont jamais facturés : dépose de l'existant quand une pose est prévue sans dépose associée, protection du chantier (sol, mobilier), évacuation des déchets/gravats, finitions, nettoyage de fin de chantier. N'en invente jamais si rien ne manque clairement : une liste vide est la réponse correcte la plupart du temps.

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte :
{
  "postes": [
    {
      "description": "...",
      "categorie": "main_oeuvre" | "fourniture" | "forfait",
      "quantite": 0,
      "unite": "m² | unité | forfait | heure",
      "temps_estime_heures": 0
    }
  ],
  "postes_oublies_probables": [
    {
      "description": "...",
      "categorie": "main_oeuvre" | "fourniture" | "forfait",
      "quantite": 0,
      "unite": "m² | unité | forfait | heure",
      "temps_estime_heures": 0
    }
  ]
}

"temps_estime_heures" est obligatoire uniquement si categorie = "main_oeuvre" (sinon omets-le).
Propose entre 3 et 6 postes cohérents avec le métier et la description du projet dans "postes".
"postes_oublies_probables" contient entre 0 et ${MAX_SUGGESTIONS_OUBLIS} éléments, jamais plus — et [] si rien ne manque.`;

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

  // Toute donnée métier (projet, devis, paramètres) appartient désormais à
  // une organisation, pas à un artisan précis — un coéquipier doit pouvoir
  // générer un devis sur un projet créé par un autre membre de la même
  // équipe. Voir Module 14 dans supabase/schema.sql.
  const organisationId = await getOrganisationId(supabase, user.id);
  if (!organisationId) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }

  const limite = await verifierLimiteIA(supabase, organisationId);
  if (!limite.autorise) {
    return NextResponse.json({ error: limite.message }, { status: 429 });
  }

  // Les 4 requêtes ci-dessous sont indépendantes (aucune ne dépend du
  // résultat d'une autre) : on les lance en parallèle plutôt qu'en chaîne
  // pour ne pas payer 4 allers-retours réseau séquentiels à chaque
  // régénération de devis.
  const [
    { data: projet, error: fetchError },
    { data: notesVocales },
    { data: profil },
    { data: parametresBrutes },
    notesActives,
  ] = await Promise.all([
    // Filtre organisation_id explicite en plus de la RLS : défense en
    // profondeur, pour ne pas dépendre uniquement d'une policy qui pourrait
    // être modifiée par erreur plus tard (relevé lors de l'audit du 12/08).
    supabase
      .from("demandes")
      .select(
        "statut, nom_client, description, informations_disponibles, notes, type_chantier, questions_manquantes, derniere_modification_le, dernier_devis_genere_le"
      )
      .eq("id", demandeId)
      .eq("organisation_id", organisationId)
      .single(),
    // Mêmes sources que l'analyse IA (voir /api/ai/analyser-demande) : sans
    // ça, une note vocale dictée après une visite ou en fin de chantier ne
    // changerait jamais un devis régénéré, alors que c'est justement ce qui
    // doit se passer en un clic.
    supabase
      .from("notes_vocales")
      .select("transcription, created_at")
      .eq("demande_id", demandeId)
      .order("created_at", { ascending: true }),
    supabase.from("profils").select("metier").eq("id", user.id).single(),
    // Paramètres entreprise : s'ils n'existent pas encore, on utilise des
    // valeurs par défaut plutôt que de bloquer — mais le devis généré
    // porte une mention invitant l'artisan à les configurer. Partagés par
    // toute l'équipe (une ligne par organisation, pas par personne).
    supabase.from("parametres_entreprise").select("*").eq("organisation_id", organisationId).maybeSingle(),
    // Audit IA (11/09) — manquait ici alors que /api/ai/analyser-demande les
    // inclut déjà : une note structurée ("accès par la cour uniquement", "le
    // client veut du carrelage grand format"...) n'atteignait l'IA que si
    // elle avait déjà été digérée dans questions_manquantes.resume par une
    // analyse antérieure encore à jour — invisible sinon.
    listerNotesActivesProjet(supabase, demandeId),
  ]);

  if (fetchError || !projet) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Un devis a déjà été généré pour ce projet et rien n'a changé depuis
  // (aucune note, aucune modification) : relancer l'IA reproduirait
  // exactement le même résultat pour un appel gaspillé. Même logique que le
  // garde-fou déjà en place dans /api/ai/analyser-demande. L'artisan qui
  // veut vraiment repartir de zéro peut toujours dupliquer un devis existant
  // (/api/devis/dupliquer) et l'ajuster à la main — cette route reste
  // dédiée à la première génération après un changement réel.
  if (
    projet.dernier_devis_genere_le &&
    (!projet.derniere_modification_le ||
      new Date(projet.derniere_modification_le) <= new Date(projet.dernier_devis_genere_le))
  ) {
    return NextResponse.json(
      {
        error:
          "Rien de nouveau depuis le dernier devis généré — ajoutez une note ou dupliquez le devis existant pour l'ajuster.",
      },
      { status: 400 }
    );
  }

  const blocNotesVocales = (notesVocales ?? [])
    .map((n, i) => `Note vocale ${i + 1} : "${n.transcription}"`)
    .join("\n");

  // Anti-oubli (06/09) — la checklist du métier n'est pas une liste de
  // postes de travaux (ce sont des questions à vérifier sur place), mais
  // elle donne un contexte utile à l'IA pour repérer des oublis probables
  // (ex. "dépose de l'ancienne menuiserie incluse ?" pointe directement
  // vers un poste souvent manquant). Purement informationnel dans le
  // prompt, jamais recopié tel quel dans les postes.
  const checklist = obtenirChecklist(projet.type_chantier, profil?.metier);
  const blocChecklist = checklist?.length
    ? `\nPoints de vigilance habituels pour ce métier (informationnel, pas des postes en soi) :\n${checklist.map((p) => `- ${p}`).join("\n")}`
    : "";

  const parametresConfigures = Boolean(parametresBrutes);
  const parametres: ParametresEntreprise = parametresBrutes
    ? (parametresBrutes as ParametresEntreprise)
    : { id: "defaut", artisan_id: user.id, organisation_id: organisationId, ...PARAMETRES_PAR_DEFAUT };

  const messageUtilisateur = `Métier de l'artisan : ${profil?.metier ?? "non précisé"}
Type de chantier : ${projet.type_chantier ?? "non précisé"}
Projet : "${projet.description}"
Informations disponibles : "${projet.informations_disponibles ?? "aucune"}"
Notes libres de l'artisan : "${projet.notes ?? "aucune"}"
${
  projet.questions_manquantes?.resume
    ? `Résumé déjà établi par l'IA : "${projet.questions_manquantes.resume}"`
    : ""
}
Notes importantes enregistrées par l'artisan pour ce projet :
${formaterNotesPourPromptIA(notesActives)}
${blocNotesVocales ? `\nNotes vocales dictées sur le terrain (les plus récentes reflètent l'état actuel du chantier, y compris d'éventuels changements) :\n${blocNotesVocales}` : ""}${blocChecklist}`;

  const debutAppel = Date.now();
  try {
    const reponseTexte = await appelerClaude(SYSTEM_PROMPT, messageUtilisateur, request.signal);
    const { postes, postes_oublies_probables } = parserReponseJSON<{
      postes: PosteTravailIA[];
      postes_oublies_probables?: PosteTravailIA[];
    }>(reponseTexte);

    // Un devis sans aucun poste ne doit jamais atteindre l'écran de
    // validation en silence — mieux vaut un message d'erreur clair que de
    // laisser l'artisan valider (et potentiellement envoyer) un devis vide
    // à 0€ sans s'en rendre compte. Array.isArray() explicite (pas juste
    // "!postes") : si l'IA renvoie "postes" comme un objet ou une chaîne
    // au lieu d'un tableau, ".length" ne le détecterait pas forcément et
    // ".find()" plus bas planterait avec une TypeError non gérée.
    if (!Array.isArray(postes) || postes.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a proposé aucun poste de travaux. Réessayez, ou complétez d'abord la description du projet." },
        { status: 502 }
      );
    }

    // Garde-fou avant d'entrer dans le moteur de calcul déterministe : une
    // réponse JSON de l'IA mal formée (quantité manquante, négative, texte
    // au lieu d'un nombre...) ne doit jamais produire un devis avec des
    // totaux NaN ou négatifs qui passerait ensuite les contrôles de
    // ValiderDevis (NaN <= 0 vaut "false" en JS, donc un devis cassé
    // pourrait sinon être validé et envoyé tel quel à un client).
    const posteInvalide = postes.find((p) => !posteEstValide(p));
    if (posteInvalide) {
      return NextResponse.json(
        { error: "L'IA a renvoyé un poste de travaux mal formé. Réessayez la génération." },
        { status: 502 }
      );
    }

    // Calcul entièrement déterministe, aucun appel IA à partir d'ici.
    const devisCalcule = calculerDevis(postes, parametres);

    // Anti-oubli (06/09) — contrairement aux postes principaux, un item mal
    // formé ici est filtré silencieusement plutôt que de faire échouer toute
    // la génération : c'est une suggestion annexe, pas le devis lui-même.
    // Chaque suggestion retenue est chiffrée par le MÊME moteur déterministe
    // (jamais un prix à 0€ à deviner par l'artisan) — calculerDevis() sur un
    // tableau d'un seul poste renvoie une unique ligne calculée.
    // Array.isArray() explicite : un champ "postes_oublies_probables"
    // malformé (objet, chaîne...) ne doit jamais faire planter la
    // génération du devis principal, qui, lui, est déjà valide à ce stade.
    const lignesSuggerees: LigneDevisCalculee[] = (
      Array.isArray(postes_oublies_probables) ? postes_oublies_probables : []
    )
      .filter(posteEstValide)
      .slice(0, MAX_SUGGESTIONS_OUBLIS)
      .map((p) => calculerDevis([p], parametres).lignes[0]);

    // Numéro séquentiel par ORGANISATION et par année (ex : 2026-014) plutôt
    // qu'un identifiant aléatoire — un devis envoyé à un client doit
    // ressembler à un vrai document professionnel dès le premier essai,
    // pas à un ticket généré au hasard. On compte les devis déjà émis
    // cette année et on incrémente. Par organisation (et non plus par
    // artisan individuel) : la numérotation légale doit être continue pour
    // l'ENTREPRISE entière, pas recommencer à zéro pour chaque employé.
    //
    // Deux requêtes concurrentes (double clic, deux onglets, un retry
    // réseau — ou désormais deux membres de la même équipe qui génèrent un
    // devis au même moment) pourraient en théorie compter le même total et
    // tenter d'insérer le même numéro — la base le refuse grâce à une
    // contrainte unique (organisation_id, numero). Une boucle de quelques
    // tentatives, en recomptant à chaque fois, couvre largement ce cas
    // réel sans construire un compteur atomique en base, disproportionné à
    // cette échelle.
    const anneeCourante = new Date().getFullYear();
    const MAX_TENTATIVES_NUMERO = 5;
    // TypeScript ne garde pas le narrowing de "user non-null" (vérifié plus
    // haut) à l'intérieur d'une fonction imbriquée définie plus loin — on
    // capture les ids dans des constantes juste avant, une seule fois.
    const artisanId = user.id;
    const orgId = organisationId;

    async function inserer() {
      const { count: nbDevisCetteAnnee } = await supabase
        .from("devis")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", orgId)
        .gte("created_at", `${anneeCourante}-01-01`)
        .lt("created_at", `${anneeCourante + 1}-01-01`);

      const numero = `${anneeCourante}-${String((nbDevisCetteAnnee ?? 0) + 1).padStart(3, "0")}`;

      return supabase
        .from("devis")
        .insert({
          demande_id: demandeId,
          artisan_id: artisanId,
          organisation_id: orgId,
          numero,
          lignes: devisCalcule.lignes,
          sous_total_ht: devisCalcule.sous_total_ht,
          deplacement: devisCalcule.deplacement,
          marge_pct: devisCalcule.marge_pct,
          tva_pct: devisCalcule.tva_pct,
          montant_tva: devisCalcule.montant_tva,
          total_estime: devisCalcule.total_ttc,
          suggestions_oublis: lignesSuggerees.length > 0 ? lignesSuggerees : null,
          parametres_configures: parametresConfigures,
        })
        .select()
        .single();
    }

    let devis: Awaited<ReturnType<typeof inserer>>["data"] = null;
    let insertError: Awaited<ReturnType<typeof inserer>>["error"] = null;

    // Code Postgres 23505 = violation de contrainte unique. On ne
    // reboucle que pour cette cause précise, jamais pour une vraie
    // erreur (plus de tentatives ne résoudrait rien d'autre).
    for (let tentative = 1; tentative <= MAX_TENTATIVES_NUMERO; tentative++) {
      ({ data: devis, error: insertError } = await inserer());
      if (!insertError || insertError.code !== "23505") break;
    }

    if (insertError || !devis) {
      // Constaté le 13/09 en production : la génération de devis échouait
      // à 100%, et ce bloc rendait la cause introuvable — l'erreur
      // Postgres réelle n'était journalisée NULLE PART, seulement
      // "echec_enregistrement". La cause était en fait triviale : la
      // colonne `suggestions_oublis` (Module 29) n'avait jamais été
      // appliquée sur la base de production, donc l'INSERT était rejeté.
      // Des heures de diagnostic pour une information que la base donnait
      // dès la première seconde.
      console.error("Échec d'enregistrement du devis :", insertError);
      await enregistrerLog(supabase, {
        artisanId: user.id,
        organisationId,
        type: "erreur_ia",
        contexte: demandeId,
        details: {
          etape: "devis",
          erreur: "echec_enregistrement",
          code: insertError?.code,
          message: insertError?.message,
        },
      });

      // 42703 = colonne inexistante, PGRST204 = colonne inconnue du cache
      // PostgREST. Dans les deux cas, le code attend une colonne que la
      // base n'a pas : c'est une migration non appliquée, jamais une
      // erreur passagère. Le dire explicitement évite de chercher du côté
      // de l'IA (qui a parfaitement fait son travail à ce stade) et de
      // réessayer en boucle une opération qui échouera à l'identique.
      const migrationManquante =
        insertError?.code === "42703" || insertError?.code === "PGRST204";

      return NextResponse.json(
        {
          error: migrationManquante
            ? "Base de données pas à jour : une colonne attendue par l'application est absente. Rejouez supabase/schema.sql dans l'éditeur SQL Supabase."
            : "Devis généré mais non enregistré",
        },
        { status: 500 }
      );
    }

    // Horodate cette génération pour pouvoir détecter, la prochaine fois,
    // qu'aucune modification n'a eu lieu depuis (garde-fou ci-dessus, même
    // principe que derniere_analyse_le pour l'analyse IA).
    //
    // Défense en profondeur (bug trouvé à l'audit du 25/08) : un projet déjà
    // "accepte" ou "en_cours" ne doit JAMAIS être rétrogradé à
    // "devis_genere" par une régénération — ça ferait perdre silencieusement
    // l'état d'avancement réel du chantier. L'UI n'appelle plus cette route
    // dans ce cas (elle propose de dupliquer le devis à la place, voir
    // app/dashboard/demandes/[id]/page.tsx), mais on protège aussi ici au
    // cas où la route serait appelée directement.
    const statutProtege = projet.statut === "accepte" || projet.statut === "en_cours";
    await supabase
      .from("demandes")
      .update({
        ...(statutProtege ? {} : { statut: "devis_genere" }),
        dernier_devis_genere_le: new Date().toISOString(),
      })
      .eq("id", demandeId)
      .eq("organisation_id", organisationId);

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "devis_genere",
      contexte: demandeId,
      details: {
        nb_lignes: devisCalcule.lignes.length,
        total_ttc: devisCalcule.total_ttc,
        parametres_configures: parametresConfigures,
      },
    });

    return NextResponse.json({ devis, parametresConfigures });
  } catch (err) {
    const dureeMs = Date.now() - debutAppel;
    // L'artisan a quitté la page avant la fin de l'appel (navigation,
    // fermeture d'onglet) — request.signal se propage jusque dans
    // appelerClaude, qui coupe l'appel Anthropic en cours plutôt que de le
    // laisser tourner pour rien. Ce n'est pas un vrai échec IA : pas de log
    // "erreur_ia", juste une réponse (que le client ne recevra de toute
    // façon jamais).
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
        etape: "devis",
        erreur: String(err),
        code: err instanceof ErreurIA ? err.code : undefined,
        duree_ms: dureeMs,
      },
    });
    return NextResponse.json({ error: message }, { status: statut });
  }
}
