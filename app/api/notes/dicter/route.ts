import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appelerClaude, parserReponseJSON, ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";
import type { ImportanceNote } from "@/types";

// ============================================================
// Point 7 du brief (29/08) : "Penser à appeler le fournisseur demain
// matin." dicté → Compyo propose titre/description/importance, TOUJOURS
// modifiable avant validation (voir components/notes/FormulaireNote.tsx —
// jamais enregistré directement, comme partout ailleurs dans l'app où
// l'IA propose sans jamais décider seule).
// ============================================================

const SYSTEM_PROMPT = `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

Un artisan vient de dicter une note à voix haute (pense-bête, tâche, idée, information client, remarque technique...). Structure-la en JSON.

Réponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "titre": "titre court (5-8 mots max) qui résume la note",
  "description": "le reste du contenu utile, ou une chaîne vide si le titre suffit déjà à tout dire",
  "importance": "verte | orange | rouge — verte par défaut pour une note ordinaire, orange si ça semble mériter attention avant peu, rouge UNIQUEMENT si le texte évoque une urgence explicite (fuite, sécurité, client mécontent, délai serré)",
  "nom_client_mentionne": "nom de famille ou nom complet explicitement cité dans le texte (ex: \\"chez Dupont\\", \\"pour M. Martin\\", \\"le chantier Lefebvre\\"), sinon null — ne jamais déduire un nom depuis un lieu, un matériau ou un mot générique"
}`;

type ReponseStructuree = {
  titre: string;
  description: string;
  importance: ImportanceNote;
  nom_client_mentionne?: unknown;
};

// Gap 2 (11/09, voir prompt-cowork-ia-notes-urgence.md) — rapprochement
// automatique d'une note générale avec un projet ouvert, à partir d'un nom
// cité dans le texte dicté. Le choix du projet reste toujours DÉTERMINISTE
// (comparaison de mots normalisés côté code), jamais laissé à l'IA : en
// cas d'ambiguïté (plusieurs projets ouverts au nom proche, ex. deux
// "Martin"), on ne devine jamais — l'artisan choisit lui-même dans le
// menu déroulant, comme avant. Pas de mode "auto" ici (contrairement au
// gap 1 / urgence) : le risque d'homonyme est réel, on attend de vraies
// données de bêta avant d'y penser (voir échange avec Cowork).
const DIACRITIQUES_COMBINANTS = /[̀-ͯ]/g;

function normaliserNom(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITIQUES_COMBINANTS, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function motsSignificatifs(s: string): string[] {
  return normaliserNom(s)
    .split(/\s+/)
    .filter((mot) => mot.length >= 3);
}

function trouverProjetCorrespondant(
  nomMentionne: string,
  projets: { id: string; nom_client: string }[]
): { id: string; nom_client: string } | null {
  const motsMentionnes = motsSignificatifs(nomMentionne);
  if (motsMentionnes.length === 0) return null;

  const correspondances = projets.filter((p) => {
    const motsProjet = motsSignificatifs(p.nom_client);
    return motsMentionnes.some((m) => motsProjet.includes(m));
  });

  return correspondances.length === 1 ? correspondances[0] : null;
}

// Sprint Beta Final (27/08) — voir même commentaire dans preparer-brouillon.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let corps: { texte?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const texte = corps.texte?.trim();
  if (!texte) {
    return NextResponse.json({ error: "Rien à structurer" }, { status: 400 });
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
    const reponseTexte = await appelerClaude(SYSTEM_PROMPT, texte, request.signal);
    const structure = parserReponseJSON<ReponseStructuree>(reponseTexte);

    if (!structure.titre?.trim()) {
      throw new Error("Réponse IA incomplète : titre manquant");
    }
    const importanceValide: ImportanceNote = (["verte", "orange", "rouge"] as const).includes(
      structure.importance
    )
      ? structure.importance
      : "verte";
    const nomClientMentionne =
      typeof structure.nom_client_mentionne === "string" && structure.nom_client_mentionne.trim()
        ? structure.nom_client_mentionne.trim()
        : null;

    // Gap 2 — un nom a été cité : on cherche une correspondance sans faire
    // confiance à l'IA pour choisir l'id elle-même (voir
    // trouverProjetCorrespondant plus haut). Aucune requête supplémentaire
    // si aucun nom n'a été détecté, cas le plus fréquent.
    let demandeIdSuggere: string | null = null;
    let nomClientSuggere: string | null = null;
    if (nomClientMentionne) {
      const { data: projetsOuverts } = await supabase
        .from("demandes")
        .select("id, nom_client")
        .eq("organisation_id", organisationId)
        .neq("statut", "termine");
      const correspondance = trouverProjetCorrespondant(nomClientMentionne, projetsOuverts ?? []);
      if (correspondance) {
        demandeIdSuggere = correspondance.id;
        nomClientSuggere = correspondance.nom_client;
      }
    }

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "note_dictee",
    });

    return NextResponse.json({
      titre: structure.titre.trim(),
      description: structure.description?.trim() || "",
      importance: importanceValide,
      demandeIdSuggere,
      nomClientSuggere,
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
      details: {
        etape: "note_dictee",
        erreur: String(err),
        code: err instanceof ErreurIA ? err.code : undefined,
        duree_ms: dureeMs,
      },
    });
    return NextResponse.json({ error: message }, { status: statut });
  }
}
