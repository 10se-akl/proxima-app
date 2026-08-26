import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appelerClaude, ErreurIA, reponseErreurIA } from "@/lib/ai/client";
import { getOrganisationId } from "@/lib/organisation";
import { verifierLimiteIA } from "@/lib/limiteIA";

// ============================================================
// Génère (à la demande, pas automatiquement) des pistes d'amélioration IA
// — bouton dédié côté /carte-mentale (vue admin). Deux modes :
// - probleme_id : un seul sous-thème (comportement historique), résultat
//   mis en cache dans problemes_produits.propositions_ia.
// - categorie : la refonte "cerveau de Compyo" (Module 21) affiche une
//   planète par CATÉGORIE entière, qui peut regrouper plusieurs
//   sous-thèmes — l'échantillon de témoignages est alors puisé sur TOUS
//   les sous-thèmes de la catégorie, pas juste un seul. Pas de cache dans
//   ce mode (pas de ligne unique où l'écrire) : un clic explicite reste un
//   coût IA assumé et rare, cohérent avec le reste du produit.
// ============================================================

const SYSTEM_PROMPT = `Tu conseilles le créateur d'un logiciel appelé Compyo, destiné à des artisans du bâtiment (maçons, plombiers, électriciens, chauffagistes, couvreurs).

On te donne un thème (ou une catégorie regroupant plusieurs sous-thèmes) de retours utilisateurs et un échantillon de témoignages bruts d'artisans à ce sujet.

Propose 2 à 4 pistes d'amélioration concrètes et réalistes pour un développeur solo, classées par priorité. Reste pragmatique : pas de refonte générale, des actions ciblées.

Réponds en texte simple (pas de JSON), format liste à puces avec "-", en français, sans préambule ni conclusion.`;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { probleme_id: problemeId, categorie } = await request.json();
  if (!problemeId && !categorie) {
    return NextResponse.json({ error: "probleme_id ou categorie requis" }, { status: 400 });
  }

  // Manquant jusqu'ici (relevé à l'audit IA du 25/08) : c'était la seule
  // route /api/ai*-like sans garde-fou de fréquence — risque faible vu
  // qu'elle est réservée à ADMIN_EMAIL, mais autant rester cohérent avec
  // toutes les autres routes IA du produit plutôt que de faire une
  // exception non documentée.
  const organisationId = await getOrganisationId(supabase, user.id);
  if (organisationId) {
    const limite = await verifierLimiteIA(supabase, organisationId);
    if (!limite.autorise) {
      return NextResponse.json({ error: limite.message }, { status: 429 });
    }
  }

  const admin = createAdminClient();

  if (categorie) {
    const { data: problemesCategorie } = await admin
      .from("problemes_produits")
      .select("id, titre, resume_ia")
      .eq("categorie", categorie);

    const ids = (problemesCategorie ?? []).map((p) => p.id);
    if (ids.length === 0) {
      return NextResponse.json({ error: "Aucun thème dans cette catégorie" }, { status: 404 });
    }

    const { data: avis } = await admin
      .from("retours_produits")
      .select("texte_nettoye, commentaire, importance, probleme_id")
      .in("probleme_id", ids)
      .order("created_at", { ascending: false })
      .limit(20);

    const titreParId = new Map((problemesCategorie ?? []).map((p) => [p.id, p.titre]));
    const echantillon = (avis ?? [])
      .map((a) => `- [${titreParId.get(a.probleme_id) ?? "?"}] (${a.importance}/10) ${a.texte_nettoye ?? a.commentaire ?? ""}`)
      .filter((l) => !l.endsWith("(undefined/10) "))
      .join("\n");

    const listeThemes = (problemesCategorie ?? [])
      .map((p) => `- ${p.titre}${p.resume_ia ? ` : ${p.resume_ia}` : ""}`)
      .join("\n");

    try {
      const propositions = await appelerClaude(
        SYSTEM_PROMPT,
        `Catégorie : "${categorie}"\nSous-thèmes de cette catégorie :\n${listeThemes}\n\nTémoignages :\n${echantillon || "(aucun témoignage textuel disponible)"}`,
        request.signal
      );
      return NextResponse.json({ propositions_ia: propositions.trim() });
    } catch (err) {
      if (err instanceof ErreurIA && err.code === "annule") {
        return NextResponse.json({ error: "Requête annulée." }, { status: 499 });
      }
      console.error(err);
      const { message, statut } = reponseErreurIA(err);
      return NextResponse.json({ error: message }, { status: statut });
    }
  }

  const [{ data: probleme }, { data: avis }] = await Promise.all([
    admin.from("problemes_produits").select("id, titre, resume_ia").eq("id", problemeId).maybeSingle(),
    admin
      .from("retours_produits")
      .select("texte_nettoye, commentaire, importance")
      .eq("probleme_id", problemeId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (!probleme) {
    return NextResponse.json({ error: "Thème introuvable" }, { status: 404 });
  }

  const echantillon = (avis ?? [])
    .map((a) => `- (${a.importance}/10) ${a.texte_nettoye ?? a.commentaire ?? ""}`)
    .filter((l) => l.trim() !== "- (undefined/10)")
    .join("\n");

  try {
    const propositions = await appelerClaude(
      SYSTEM_PROMPT,
      `Thème : "${probleme.titre}"\nRésumé actuel : "${probleme.resume_ia ?? "aucun"}"\n\nTémoignages :\n${echantillon || "(aucun témoignage textuel disponible)"}`,
      request.signal
    );

    await admin
      .from("problemes_produits")
      .update({ propositions_ia: propositions.trim() })
      .eq("id", problemeId);

    return NextResponse.json({ propositions_ia: propositions.trim() });
  } catch (err) {
    if (err instanceof ErreurIA && err.code === "annule") {
      return NextResponse.json({ error: "Requête annulée." }, { status: 499 });
    }
    console.error(err);
    const { message, statut } = reponseErreurIA(err);
    return NextResponse.json({ error: message }, { status: statut });
  }
}
