import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IDEES_VOTEES, compterLesVotes, type ResultatVote } from "@/lib/ideesVotees";

// ============================================================
// Les résultats du sondage de l'accueil (02/11/2026) : pour chaque idée,
// combien de votes « Bonne idée » et « Pas pour moi », votes retirés
// déduits (lib/ideesVotees.ts). Lecture seule.
//
// Un vote est une visite anonyme /vote/<idée>/<oui|non> (voir
// components/marketing/carnet/VotesIdees.tsx et app/api/visite) : on
// compte les empreintes distinctes, on ne renvoie que des totaux, et
// seulement pour les idées de lib/ideesVotees.ts. Mis en cache 30 s.
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const ids = IDEES_VOTEES.map((i) => i.id);
  let resultats: Record<string, ResultatVote> = Object.fromEntries(ids.map((id) => [id, { oui: 0, non: 0 }]));
  try {
    const { data, error } = await createAdminClient()
      .from("visites")
      .select("chemin")
      .like("chemin", "/vote/%")
      .limit(20000);
    if (error) throw error;
    // Un vote ajoute 1, un vote retiré (annule-…) enlève 1.
    resultats = compterLesVotes((data ?? []).map((l) => String(l.chemin)), ids);
  } catch (err) {
    console.error("Résultats des votes :", err);
  }
  return NextResponse.json(resultats, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
