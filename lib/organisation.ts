import type { SupabaseClient } from "@supabase/supabase-js";

// Résout l'organisation_id de l'utilisateur connecté. Toute page/route qui
// filtrait auparavant par "artisan_id = user.id" doit maintenant résoudre
// cet id une fois par requête, puis filtrer par "organisation_id" — voir
// Module 14 dans supabase/schema.sql pour le contexte complet (comptes
// d'équipe multi-utilisateurs).
//
// Un utilisateur normal appartient à exactement une organisation (créée
// automatiquement à l'acceptation de sa candidature, ou rejointe via une
// invitation d'équipe) : .maybeSingle() plutôt que .single() uniquement
// pour ne pas planter platement si jamais ce n'est pas encore le cas
// (ex : compte tout juste créé, avant que le backfill ne soit passé).
export async function getOrganisationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.organisation_id ?? null;
}

// Idem, mais renvoie aussi le rôle — utile pour l'UI de gestion d'équipe
// (seul un "proprietaire" peut inviter/retirer un membre) et pour les
// routes serveur qui doivent vérifier ce rôle avant d'agir.
export async function getMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<{ organisationId: string; role: "proprietaire" | "employe" } | null> {
  const { data } = await supabase
    .from("memberships")
    .select("organisation_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { organisationId: data.organisation_id, role: data.role as "proprietaire" | "employe" };
}
