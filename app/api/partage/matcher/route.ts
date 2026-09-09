import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { extraireTelephone } from "@/lib/clients/extraireTelephone";
import { rechercherClientParTelephone, rechercherProjetsOuvertsClient } from "@/lib/clients";

// ============================================================
// Sprint Beta Final (27/08) — point 2 du brief : "avant tout appel IA sur
// un message partagé, chercher le numéro, chercher un client existant,
// chercher les projets ouverts". Cette route fait exactement ça, et
// RIEN d'autre — aucun appel Claude ici, uniquement une regex (voir
// lib/clients/extraireTelephone.ts) et deux requêtes SQL (voir
// lib/clients/index.ts). Appelée par app/dashboard/demandes/partage/[id]/
// page.tsx AVANT /api/ai/preparer-brouillon, jamais après.
//
// Ne décide jamais à la place de l'artisan : le résultat est toujours
// présenté comme un choix explicite (voir composant de revue), jamais un
// rattachement silencieux — risque de faux positif identifié à l'audit
// (numéro partagé dans un foyer, deux chantiers différents chez le même
// client) plus coûteux à corriger qu'un simple doublon.
//
// Audit pré-bêta (09/09), point 🔴 n°1 — `texte` accepté en plus de
// `partageId` : le parcours de collage manuel (app/dashboard/demandes/
// importer/page.tsx, utilisé sur iPhone où Web Share Target n'existe pas)
// n'a jamais de ligne `partages_entrants` à lire — le message n'existe
// qu'en mémoire côté client. Même logique de matching ensuite, à
// l'identique : seule la SOURCE du texte change.
// ============================================================

export async function POST(request: NextRequest) {
  let corps: { partageId?: string; texte?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { partageId, texte: texteDirect } = corps;
  if (!partageId && !texteDirect) {
    return NextResponse.json({ error: "partageId ou texte manquant" }, { status: 400 });
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

  let texte: string | null;
  if (partageId) {
    const { data: partage } = await supabase
      .from("partages_entrants")
      .select("texte")
      .eq("id", partageId)
      .single();
    texte = partage?.texte ?? null;
  } else {
    texte = texteDirect?.trim() || null;
  }

  if (!texte) {
    return NextResponse.json({ statut: "aucun" });
  }

  const telephone = extraireTelephone(texte);
  if (!telephone) {
    return NextResponse.json({ statut: "aucun" });
  }

  const client = await rechercherClientParTelephone(supabase, organisationId, telephone);
  if (!client) {
    return NextResponse.json({ statut: "aucun" });
  }

  const projets = await rechercherProjetsOuvertsClient(supabase, organisationId, client.id);

  if (projets.length === 0) {
    return NextResponse.json({ statut: "aucun" });
  }

  if (projets.length === 1) {
    return NextResponse.json({ statut: "un", clientId: client.id, projet: projets[0] });
  }

  return NextResponse.json({ statut: "plusieurs", clientId: client.id, projets });
}
