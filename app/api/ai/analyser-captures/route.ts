import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaudeAvecImage, parserReponseJSON } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";

// Cette route ne fait QUE lire les captures d'écran et proposer des
// informations — elle n'écrit jamais rien en base. C'est
// /api/ai/confirmer-import-captures qui crée réellement les projets ou
// ajoute des notes, seulement après relecture de l'artisan. Même
// philosophie que l'import d'un message collé : l'IA propose, elle
// n'ajoute jamais seule.
function construirePrompt(dateDuJour: string) {
  return `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

Nous sommes le ${dateDuJour}.

Voici une capture d'écran d'une conversation reçue par un artisan (WhatsApp, SMS, ou une autre messagerie). Lis le texte visible sur l'image et extrais-en les informations suivantes, UNIQUEMENT si elles sont explicitement présentes — n'invente jamais une information absente. S'il y a plusieurs messages sur la capture, concentre-toi sur ce qui concerne une demande de travaux.

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte :
{
  "nom_client": "nom trouvé (dans les messages ou le nom du contact affiché en haut de la conversation), ou \\"Client à identifier\\" si absent",
  "telephone_client": "numéro trouvé ou null",
  "type_chantier": "salle_de_bain | cuisine | peinture | toiture | electricite | plomberie | chauffage | renovation_complete | autre",
  "description_resumee": "résumé en une ou deux phrases de ce que veut le client, à partir des messages visibles",
  "rdv_date": "date au format AAAA-MM-JJ UNIQUEMENT si un jour de rendez-vous est explicitement proposé ou confirmé, sinon null",
  "rdv_heure": "heure au format HH:MM UNIQUEMENT si explicitement mentionnée, sinon null",
  "capture_illisible": true UNIQUEMENT si l'image ne contient aucun texte exploitable, sinon false
}`;
}

type Extrait = {
  nom_client: string;
  telephone_client: string | null;
  type_chantier: string;
  description_resumee: string;
  rdv_date: string | null;
  rdv_heure: string | null;
  capture_illisible: boolean;
};

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

  const resultats = await Promise.all(
    images.map(async (image, index) => {
      try {
        const reponseTexte = await appelerClaudeAvecImage(
          construirePrompt(dateDuJour),
          "Voici la capture d'écran à analyser.",
          image
        );
        const extrait = parserReponseJSON<Extrait>(reponseTexte);

        if (extrait.capture_illisible) {
          return {
            index,
            erreur: "Aucun texte lisible trouvé sur cette capture.",
          };
        }

        // Rapprochement déterministe : correspondance sur le nom (sans
        // tenir compte de la casse) ou sur le téléphone si les deux le
        // mentionnent. Plusieurs correspondances possibles → toutes
        // proposées, l'artisan choisit.
        const nomNormalise = extrait.nom_client.trim().toLowerCase();
        const telNormalise = extrait.telephone_client?.replace(/\s+/g, "");
        const correspondances = (projetsActifs ?? []).filter((p) => {
          const memeNom =
            nomNormalise.length > 2 && p.nom_client.toLowerCase().includes(nomNormalise);
          const memeTel =
            telNormalise &&
            p.telephone_client &&
            p.telephone_client.replace(/\s+/g, "") === telNormalise;
          return memeNom || memeTel;
        });

        return {
          index,
          extrait,
          correspondances: correspondances.map((c) => ({ id: c.id, nomClient: c.nom_client })),
        };
      } catch (err) {
        console.error(err);
        return { index, erreur: "L'IA n'a pas pu lire cette capture." };
      }
    })
  );

  await enregistrerLog(supabase, {
    artisanId: user.id,
    organisationId,
    type: "analyse_ia",
    contexte: undefined,
    details: { etape: "analyser_captures", nb_captures: images.length },
  });

  return NextResponse.json({ resultats });
}
