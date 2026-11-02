import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IDEES_VOTEES, type ResultatVote } from "@/lib/ideesVotees";

// ============================================================
// Les résultats du sondage de l'accueil (02/11/2026) : pour chaque idée,
// combien de votants « Bonne idée » et « Pas pour moi ». Lecture seule.
//
// Un vote est une visite anonyme /vote/<idée>/<oui|non> (voir
// components/marketing/carnet/VotesIdees.tsx et app/api/visite) : on
// compte les empreintes distinctes, on ne renvoie que des totaux, et
// seulement pour les idées de lib/ideesVotees.ts. Mis en cache 30 s.
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const resultats: Record<string, ResultatVote> = Object.fromEntries(IDEES_VOTEES.map((i) => [i.id, { oui: 0, non: 0 }]));
  try {
    const { data, error } = await createAdminClient()
      .from("visites")
      .select("chemin, visiteur")
      .like("chemin", "/vote/%")
      .limit(20000);
    if (error) throw error;
    const vus = new Set<string>();
    for (const ligne of data ?? []) {
      const [, , idee, choix] = String(ligne.chemin).split("/");
      if (!(idee in resultats) || (choix !== "oui" && choix !== "non")) continue;
      const cle = `${idee}|${choix}|${ligne.visiteur}`;
      if (vus.has(cle)) continue;
      vus.add(cle);
      resultats[idee][choix] += 1;
    }
  } catch (err) {
    console.error("Résultats des votes :", err);
  }
  return NextResponse.json(resultats, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
