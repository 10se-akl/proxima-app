import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude, parserReponseJSON, ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";
import type { TypeChantier } from "@/types";

// Même garde-fou que dans confirmer-import-captures : "type_chantier" est
// un texte libre en base, sans contrainte enum — on revalide côté serveur
// avant d'écrire, plutôt que de faire confiance à la réponse de l'IA.
// Revue métier (06/09) — liste élargie à 20 valeurs, voir types/index.ts.
const TYPES_CHANTIER_VALIDES: TypeChantier[] = [
  "renovation_complete",
  "salle_de_bain",
  "cuisine",
  "peinture",
  "toiture",
  "electricite",
  "plomberie",
  "chauffage",
  "maconnerie",
  "terrassement",
  "facade",
  "serrurerie",
  "vitrerie",
  "charpente",
  "menuiserie",
  "plaquisterie",
  "carrelage",
  "amenagement_exterieur",
  "climatisation",
  "piscine",
  "autre",
];

function typeChantierValide(valeur: string): TypeChantier {
  return (TYPES_CHANTIER_VALIDES as string[]).includes(valeur)
    ? (valeur as TypeChantier)
    : "autre";
}

// L'IA extrait des informations FACTUELLES présentes dans le message
// (nom, coordonnées si mentionnées, résumé du besoin, et une date/heure de
// rendez-vous SI le client en propose une explicitement) — elle ne calcule
// jamais rien, ne devine jamais un prix, et n'invente aucune donnée absente
// du texte fourni. La date du jour lui est donnée pour résoudre des
// expressions comme "mardi prochain" en une vraie date.
function construirePrompt(dateDuJour: string) {
  return `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

Nous sommes le ${dateDuJour}.

Un artisan colle ici un message brut reçu d'un client (SMS, email, WhatsApp...). Extrais-en les informations structurées suivantes, UNIQUEMENT si elles sont explicitement présentes dans le texte — n'invente jamais une information absente.

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte :
{
  "nom_client": "nom trouvé dans le message, ou \\"Client à identifier\\" si absent",
  "telephone_client": "numéro trouvé ou null",
  "email_client": "email trouvé ou null",
  "adresse_client": "adresse trouvée ou null",
  "type_chantier": "salle_de_bain | cuisine | peinture | toiture | electricite | plomberie | chauffage | maconnerie | terrassement | facade | serrurerie | vitrerie | charpente | menuiserie | plaquisterie | carrelage | amenagement_exterieur | climatisation | piscine | renovation_complete | autre",
  "description_resumee": "résumé en une ou deux phrases de ce que veut le client, à partir du message",
  "rdv_date": "date au format AAAA-MM-JJ UNIQUEMENT si le client propose ou confirme explicitement un jour de rendez-vous, sinon null",
  "rdv_heure": "heure au format HH:MM UNIQUEMENT si explicitement mentionnée, sinon null"
}`;
}

export async function POST(request: NextRequest) {
  const { messageBrut } = await request.json();

  if (!messageBrut || messageBrut.trim().length < 10) {
    return NextResponse.json(
      { error: "Le message est trop court pour être analysé" },
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

  const debutAppel = Date.now();
  try {
    const dateDuJour = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const reponseTexte = await appelerClaude(construirePrompt(dateDuJour), messageBrut, request.signal);
    const extrait = parserReponseJSON<{
      nom_client: string;
      telephone_client: string | null;
      email_client: string | null;
      adresse_client: string | null;
      type_chantier: string;
      description_resumee: string;
      rdv_date: string | null;
      rdv_heure: string | null;
    }>(reponseTexte);

    // Un nom_client vide ferait échouer l'insert sur une contrainte NOT NULL
    // avec un message générique peu clair (relevé à l'audit IA du 25/08) —
    // autant l'anticiper avec un message qui a du sens pour l'artisan.
    if (!extrait.nom_client?.trim()) {
      return NextResponse.json(
        { error: "L'IA n'a pas réussi à identifier le client dans ce message. Réessayez ou créez le projet manuellement." },
        { status: 502 }
      );
    }

    const { data: projet, error: insertError } = await supabase
      .from("demandes")
      .insert({
        artisan_id: user.id,
        organisation_id: organisationId,
        nom_client: extrait.nom_client,
        telephone_client: extrait.telephone_client,
        email_client: extrait.email_client,
        adresse_client: extrait.adresse_client,
        type_chantier: typeChantierValide(extrait.type_chantier),
        description: extrait.description_resumee,
        informations_disponibles: `Message d'origine :\n${messageBrut}`,
      })
      .select("id")
      .single();

    if (insertError || !projet) {
      return NextResponse.json(
        { error: "Extraction réussie mais projet non enregistré" },
        { status: 500 }
      );
    }

    await enregistrerEvenement(supabase, {
      demandeId: projet.id,
      artisanId: user.id,
      organisationId,
      type: "message_importe",
      titre: "Premier contact — message importé",
      detail: extrait.description_resumee,
    });

    let rdvPropose: { date: string; heure: string } | null = null;
    if (extrait.rdv_date) {
      const heure = extrait.rdv_heure ?? "09:00";
      const dateHeure = new Date(`${extrait.rdv_date}T${heure}`);
      // L'IA propose, elle n'ajoute jamais seule : c'est l'artisan qui
      // accepte ou change le créneau depuis l'écran suivant.
      if (!isNaN(dateHeure.getTime())) {
        rdvPropose = { date: extrait.rdv_date, heure };
      }
    }

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "analyse_ia",
      contexte: projet.id,
      details: { etape: "import_message", rdv_propose: Boolean(rdvPropose) },
    });

    return NextResponse.json({
      projetId: projet.id,
      nomClient: extrait.nom_client,
      rdvPropose,
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
        etape: "import_message",
        erreur: String(err),
        code: err instanceof ErreurIA ? err.code : undefined,
        duree_ms: dureeMs,
      },
    });
    return NextResponse.json({ error: message }, { status: statut });
  }
}
