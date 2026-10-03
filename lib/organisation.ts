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
  const { data, error } = await supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", userId)
    .maybeSingle();
  // Sprint Robustesse (30/08) — un `error` ici est un échec technique
  // (réseau, Supabase indisponible...), pas "cet artisan n'a pas
  // d'organisation". Sans ce log, les deux cas retournaient silencieusement
  // `null` et un simple souci réseau pouvait faire perdre l'accès à ses
  // propres projets à l'artisan. On garde `Promise<string | null>` tel
  // quel (signature utilisée par des dizaines d'appelants) et on logue
  // clairement pour pouvoir diagnostiquer ce cas plutôt que de le
  // confondre avec une absence réelle d'organisation.
  if (error) {
    console.error("getOrganisationId: échec Supabase (memberships)", error);
  }
  return data?.organisation_id ?? null;
}

// Idem, mais renvoie aussi le rôle — utile pour l'UI de gestion d'équipe
// (seul un "proprietaire" peut inviter/retirer un membre) et pour les
// routes serveur qui doivent vérifier ce rôle avant d'agir.
export async function getMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<{ organisationId: string; role: "proprietaire" | "employe" } | null> {
  const { data, error } = await supabase
    .from("memberships")
    .select("organisation_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  // Sprint Robustesse (30/08) — même distinction que getOrganisationId
  // ci-dessus : on logue l'échec technique avant de retomber sur `null`,
  // pour ne pas le confondre avec un artisan réellement sans organisation.
  if (error) {
    console.error("getMembership: échec Supabase (memberships)", error);
  }
  if (!data) return null;
  return { organisationId: data.organisation_id, role: data.role as "proprietaire" | "employe" };
}

export type LectureMembership =
  | { etat: "membre"; organisationId: string; role: "proprietaire" | "employe" }
  | { etat: "aucune" }
  | { etat: "erreur" };

// Refonte (03/10, duel A) — getOrganisationId et getMembership renvoient
// `null` aussi bien pour « pas d'équipe » que pour une panne réseau.
// Les décisions lourdes (renvoyer vers « Votre accès a été retiré »,
// refuser une action d'équipe) ne doivent jamais se prendre sur une
// panne : celle-ci distingue les trois cas.
export async function lireMembership(supabase: SupabaseClient, userId: string): Promise<LectureMembership> {
  const { data, error } = await supabase
    .from("memberships")
    .select("organisation_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("lireMembership: échec Supabase (memberships)", error);
    return { etat: "erreur" };
  }
  if (!data) return { etat: "aucune" };
  return { etat: "membre", organisationId: data.organisation_id, role: data.role as "proprietaire" | "employe" };
}
