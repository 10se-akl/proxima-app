import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliserTelephone } from "./normaliserTelephone";

export { normaliserTelephone };

// ============================================================
// Sprint Beta Final (27/08) — couche déterministe autour de la table
// `clients` (Module 26, supabase/schema.sql). Aucune IA ici : uniquement
// des requêtes SQL et des règles simples, exactement l'esprit de la règle
// posée pour ce sprint ("SQL → Regex → Règles → IA uniquement si
// nécessaire"). Utilisé par le parcours de partage (point 2 du brief,
// voir app/api/demandes/creer-depuis-brouillon/route.ts) et par la
// création manuelle (components/dashboard/AlerteClientExistant si présent).
// ============================================================

export type ClientTrouve = {
  id: string;
  nom: string | null;
  telephone: string | null;
};

// Recherche un client existant par téléphone normalisé — signal fort,
// jamais par nom seul ici (trop de faux positifs, voir rapport d'audit
// architecture : "un nom seul ne suffit jamais à proposer un
// rattachement automatique").
export async function rechercherClientParTelephone(
  supabase: SupabaseClient,
  organisationId: string,
  telephoneBrut: string | null
): Promise<ClientTrouve | null> {
  const telephone = normaliserTelephone(telephoneBrut);
  if (!telephone) return null;

  const { data } = await supabase
    .from("clients")
    .select("id, nom, telephone")
    .eq("organisation_id", organisationId)
    .eq("telephone", telephone)
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export type ProjetOuvert = {
  id: string;
  nom_client: string;
  type_chantier: string;
  statut: string;
  created_at: string;
};

// Projets "ouverts" d'un client = pas encore terminés — même filtre que
// celui déjà utilisé dans app/api/ai/analyser-captures/route.ts
// (`.neq("statut", "termine")`), repris tel quel pour rester cohérent.
export async function rechercherProjetsOuvertsClient(
  supabase: SupabaseClient,
  organisationId: string,
  clientId: string
): Promise<ProjetOuvert[]> {
  const { data } = await supabase
    .from("demandes")
    .select("id, nom_client, type_chantier, statut, created_at")
    .eq("organisation_id", organisationId)
    .eq("client_id", clientId)
    .neq("statut", "termine")
    .order("created_at", { ascending: false });

  return data ?? [];
}

// Trouve un client par téléphone normalisé, ou en crée un nouveau si
// aucun n'existe — utilisé au moment de la création d'un projet pour
// toujours rattacher `demandes.client_id`, même quand aucun rattachement
// n'a été proposé à l'artisan (premier contact avec ce client). Ne fait
// JAMAIS de rapprochement par nom seul : sans téléphone exploitable, un
// nouveau client est créé (ou aucun, voir retour null) plutôt que de
// risquer un faux rattachement.
export async function trouverOuCreerClient(
  supabase: SupabaseClient,
  params: {
    organisationId: string;
    nom: string | null;
    telephoneBrut: string | null;
    adresse: string | null;
    email?: string | null;
  }
): Promise<string | null> {
  const telephone = normaliserTelephone(params.telephoneBrut);
  if (!telephone) return null;

  const existant = await rechercherClientParTelephone(
    supabase,
    params.organisationId,
    params.telephoneBrut
  );
  if (existant) return existant.id;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      organisation_id: params.organisationId,
      nom: params.nom,
      telephone,
      telephone_brut: params.telephoneBrut,
      adresse: params.adresse,
      email: params.email ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id;
}
