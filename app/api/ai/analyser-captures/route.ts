import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaudeAvecImages, parserReponseJSON, ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";

// Cette route ne fait QUE lire les captures d'écran et proposer des
// informations — elle n'écrit jamais rien en base. C'est
// /api/ai/confirmer-import-captures qui crée réellement les projets ou
// ajoute des notes, seulement après relecture de l'artisan. Même
// philosophie que l'import d'un message collé : l'IA propose, elle
// n'ajoute jamais seule.
//
// Audit Cycle 2 (Agent Performance) : cette route faisait UN appel Claude
// PAR image (jusqu'à 20 pour un import groupé), répétant le prompt
// système complet à chaque fois. Un seul appel avec toutes les images,
// demandant un tableau JSON dans le même ordre, revient au même résultat
// pour une fraction du coût.
function construirePrompt(dateDuJour: string, nbImages: number) {
  return `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

Nous sommes le ${dateDuJour}.

Tu vas recevoir ${nbImages} capture(s) d'écran de conversations reçues par un artisan (WhatsApp, SMS, ou une autre messagerie), dans cet ordre précis. Pour CHAQUE capture, lis le texte visible et extrais-en les informations suivantes, UNIQUEMENT si elles sont explicitement présentes — n'invente jamais une information absente. S'il y a plusieurs messages sur une capture, concentre-toi sur ce qui concerne une demande de travaux.

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec un tableau contenant EXACTEMENT ${nbImages} élément(s), un par capture, dans le même ordre :
{
  "resultats": [
    {
      "nom_client": "nom trouvé (dans les messages ou le nom du contact affiché en haut de la conversation), ou \\"Client à identifier\\" si absent",
      "telephone_client": "numéro trouvé ou null",
      "type_chantier": "salle_de_bain | cuisine | peinture | toiture | electricite | plomberie | chauffage | maconnerie | terrassement | facade | serrurerie | vitrerie | charpente | menuiserie | plaquisterie | carrelage | amenagement_exterieur | climatisation | renovation_complete | autre",
      "description_resumee": "résumé en une ou deux phrases de ce que veut le client, à partir des messages visibles",
      "texte_brut": "retranscription FIDÈLE et COMPLÈTE du texte des messages du client visibles sur la capture, verbatim (pas un résumé) — un message par ligne si plusieurs, dans l'ordre. Chaîne vide si rien de lisible.",
      "rdv_date": "date au format AAAA-MM-JJ UNIQUEMENT si un jour de rendez-vous est explicitement proposé ou confirmé, sinon null",
      "rdv_heure": "heure au format HH:MM UNIQUEMENT si explicitement mentionnée, sinon null",
      "capture_illisible": true UNIQUEMENT si l'image ne contient aucun texte exploitable, sinon false
    }
  ]
}`;
}

type Extrait = {
  nom_client: string;
  telephone_client: string | null;
  type_chantier: string;
  description_resumee: string;
  // Sprint Beta Final (27/08) — 🔴H : jusqu'ici seul le résumé (déjà une
  // reformulation par l'IA) était conservé, jamais le texte d'origine —
  // contrairement au partage natif et au collage de message, où le texte
  // brut est systématiquement gardé (voir informations_disponibles ailleurs
  // dans l'app). Fondation nécessaire à la mémoire automatique (point 6 du
  // brief) : on ne peut rien extraire plus tard d'un texte qu'on n'a pas
  // gardé.
  texte_brut: string;
  rdv_date: string | null;
  rdv_heure: string | null;
  capture_illisible: boolean;
};

// Sprint Beta Final (27/08) — voir même commentaire dans preparer-brouillon
// : évite qu'un timeout de plateforme plus court que lib/ai/client.ts tue
// la fonction avant sa propre gestion d'erreur.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { images } = (await request.json()) as {
    images?: { base64: string; mediaType: string }[];
  };

  if (!images || images.length === 0) {
    return NextResponse.json({ error: "Aucune capture reçue" }, { status: 400 });
  }

  // Une session chargée (matinée avec beaucoup de conversations à traiter
  // d'un coup) ne doit pas se transformer en dizaines d'appels IA
  // incontrôlés — limite raisonnable pour un artisan seul, pas pour un
  // usage détourné.
  if (images.length > 20) {
    return NextResponse.json(
      { error: "Maximum 20 captures à la fois. Importez-les en plusieurs fois." },
      { status: 400 }
    );
  }

  // Audit sécurité/bugs (05/09) — 🟡 : le nombre de captures était borné,
  // pas leur poids individuel. Une capture inhabituellement lourde (scan
  // haute résolution, image non compressée) partait telle quelle vers
  // Claude, sans limite de coût ni de risque de timeout côté serveur. 8 Mo
  // décodés par image est largement suffisant pour une capture d'écran de
  // conversation (WhatsApp/SMS), tout en écartant les cas dégénérés.
  const TAILLE_MAX_IMAGE_OCTETS = 8 * 1024 * 1024;
  const imageTropLourde = images.some(
    (img) => img.base64.length * 0.75 > TAILLE_MAX_IMAGE_OCTETS
  );
  if (imageTropLourde) {
    return NextResponse.json(
      { error: "Une des captures est trop lourde (max 8 Mo par image). Réessayez avec une capture d'écran classique plutôt qu'un scan haute résolution." },
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

  // Projets actifs de l'organisation (jamais les projets terminés — inutile
  // de proposer de rattacher un nouveau message à un chantier déjà clos).
  // Le rapprochement avec les captures se fait ensuite par une comparaison
  // de texte simple, PAS par l'IA : plus prévisible, moins cher, et
  // l'artisan garde la décision finale de toute façon.
  const { data: projetsActifs } = await supabase
    .from("demandes")
    .select("id, nom_client, telephone_client")
    .eq("organisation_id", organisationId)
    .neq("statut", "termine");

  const dateDuJour = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function rapprocher(extrait: Extrait) {
    // Rapprochement déterministe : correspondance sur le nom (sans tenir
    // compte de la casse) ou sur le téléphone si les deux le mentionnent.
    // Plusieurs correspondances possibles → toutes proposées, l'artisan
    // choisit.
    const nomNormalise = extrait.nom_client.trim().toLowerCase();
    const telNormalise = extrait.telephone_client?.replace(/\s+/g, "");
    return (projetsActifs ?? []).filter((p) => {
      const memeNom =
        nomNormalise.length > 2 && p.nom_client.toLowerCase().includes(nomNormalise);
      const memeTel =
        telNormalise &&
        p.telephone_client &&
        p.telephone_client.replace(/\s+/g, "") === telNormalise;
      return memeNom || memeTel;
    });
  }

  let resultats: Array<
    | { index: number; erreur: string }
    | { index: number; extrait: Extrait; correspondances: { id: string; nomClient: string }[] }
  >;

  const debutAppel = Date.now();
  try {
    const reponseTexte = await appelerClaudeAvecImages(
      construirePrompt(dateDuJour, images.length),
      `Voici les ${images.length} capture(s) d'écran à analyser, dans l'ordre.`,
      images,
      request.signal
    );
    const { resultats: extraits } = parserReponseJSON<{ resultats: Extrait[] }>(reponseTexte);

    if (!Array.isArray(extraits) || extraits.length !== images.length) {
      throw new Error(
        `Réponse IA incohérente : ${extraits?.length ?? 0} résultat(s) pour ${images.length} image(s)`
      );
    }

    resultats = extraits.map((extrait, index) => {
      if (extrait.capture_illisible) {
        return { index, erreur: "Aucun texte lisible trouvé sur cette capture." };
      }
      const correspondances = rapprocher(extrait);
      return {
        index,
        extrait,
        correspondances: correspondances.map((c) => ({ id: c.id, nomClient: c.nom_client })),
      };
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
      contexte: undefined,
      details: {
        etape: "analyser_captures",
        erreur: String(err),
        code: err instanceof ErreurIA ? err.code : undefined,
        duree_ms: dureeMs,
      },
    });
    return NextResponse.json({ error: message }, { status: statut });
  }

  await enregistrerLog(supabase, {
    artisanId: user.id,
    organisationId,
    type: "analyse_ia",
    contexte: undefined,
    details: { etape: "analyser_captures", nb_captures: images.length },
  });

  return NextResponse.json({ resultats });
}
