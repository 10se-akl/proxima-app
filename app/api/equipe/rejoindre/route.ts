import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { etatRejoindre } from "@/lib/equipe/serveur";

// ============================================================
// Rejoindre une équipe (refonte 03/10, duel A).
//
// GET : où en est le compte connecté (invitation en cours, déjà membre,
// retiré, rien). C'est CE serveur qui dit « accès retiré » : la page
// /rejoindre ne l'affiche que sur sa réponse explicite, jamais sur une
// panne réseau (getOrganisationId renvoie null dans les deux cas).
//
// Client admin : la personne n'est encore membre d'aucune équipe, la RLS
// lui cache donc les invitations qui la concernent. Les lectures sont
// toutes bornées à son propre compte et à sa propre adresse.
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();

  try {
    const etat = await etatRejoindre(createAdminClient(), user, session?.access_token);
    return NextResponse.json(etat, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Rejoindre : lecture de l'état impossible", err);
    return NextResponse.json({ error: "Impossible de vérifier votre accès. Réessayez." }, { status: 500 });
  }
}
