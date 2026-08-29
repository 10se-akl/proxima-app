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
  "importance": "verte | orange | rouge — verte par défaut pour une note ordinaire, orange si ça semble mériter attention avant peu, rouge UNIQUEMENT si le texte évoque une urgence explicite (fuite, sécurité, client mécontent, délai serré)"
}`;

type ReponseStructuree = { titre: string; description: string; importance: ImportanceNote };

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

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "note_dictee",
    });

    return NextResponse.json({
      titre: structure.titre.trim(),
      description: structure.description?.trim() || "",
      importance: importanceValide,
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
