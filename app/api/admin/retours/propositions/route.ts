import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appelerClaude } from "@/lib/ai/client";

// ============================================================
// Génère (à la demande, pas automatiquement) des pistes d'amélioration IA
// pour un thème de la carte mentale — bouton dédié côté
// /carte-mentale (vue admin). Le résultat est mis en cache dans
// problemes_produits.propositions_ia (voir Module 16) pour ne pas
// regénérer un appel IA à chaque ouverture du panneau.
// ============================================================

const SYSTEM_PROMPT = `Tu conseilles le créateur d'un logiciel appelé Compyo, destiné à des artisans du bâtiment (maçons, plombiers, électriciens, chauffagistes, couvreurs).

On te donne un thème de retours utilisateurs (titre, résumé) et un échantillon de témoignages bruts d'artisans à ce sujet.

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

  const { probleme_id: problemeId } = await request.json();
  if (!problemeId) {
    return NextResponse.json({ error: "probleme_id requis" }, { status: 400 });
  }

  const admin = createAdminClient();

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
      `Thème : "${probleme.titre}"\nRésumé actuel : "${probleme.resume_ia ?? "aucun"}"\n\nTémoignages :\n${echantillon || "(aucun témoignage textuel disponible)"}`
    );

    await admin
      .from("problemes_produits")
      .update({ propositions_ia: propositions.trim() })
      .eq("id", problemeId);

    return NextResponse.json({ propositions_ia: propositions.trim() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Impossible de générer les propositions pour l'instant." }, { status: 502 });
  }
}
