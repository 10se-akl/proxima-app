import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// Audit Cycle 2 (Agents Sécurité + Scalabilité) : rien n'empêchait un compte
// compromis, ou un script mal intentionné, d'appeler les routes /api/ai/*
// en boucle — chaque appel a un coût réel (API Claude). Compteur simple par
// organisation, basé sur les logs déjà enregistrés à CHAQUE appel IA
// (succès ET échec — un échec consomme quand même l'appel) : pas de
// nouvelle table ni d'infra supplémentaire (Redis...), juste une lecture
// indexée sur "logs" (voir Module 19, supabase/schema.sql).
//
// Les plafonds sont volontairement larges : un artisan ou une petite équipe
// qui travaille normalement ne devrait jamais les approcher. Le but n'est
// pas de brider un usage légitime, mais d'empêcher une boucle incontrôlée.
const TYPES_APPELS_IA = [
  "analyse_ia",
  "devis_genere",
  "reponse_generee",
  "erreur_ia",
  "note_dictee",
  "journal_chantier_interprete",
] as const;

// Audit IA (12/09) — relevés après calcul du coût réel. Ces plafonds
// existent pour couper une boucle d'abus, pas pour gêner un usage intensif
// légitime : or 40 appels/heure, c'est très facile à atteindre en une
// session de test un peu poussée (essayer chaque fonctionnalité, refaire un
// devis, réimporter des captures...), et l'artisan se retrouvait alors
// bloqué par son propre outil, ce qui ressemble à une panne.
//
// Coût maximal si un plafond est réellement atteint (Sonnet 5, ~$2/$10 par
// million de tokens) : un appel texte revient à moins d'un centime, un
// appel avec captures d'écran à quelques centimes. Le pire cas reste donc
// de l'ordre de quelques euros par jour — une protection qui borne le
// risque sans transformer un usage normal en panne.
const PLAFOND_PAR_HEURE = 80;
const PLAFOND_PAR_JOUR = 300;

export async function verifierLimiteIA(
  _supabase: SupabaseClient,
  organisationId: string
): Promise<{ autorise: true } | { autorise: false; message: string }> {
  // Refonte (01/10) — le compteur lisait "logs" avec le client de
  // l'utilisateur, or "logs" n'a AUCUNE politique SELECT (insert-only,
  // Module 19) : la RLS renvoyait 0 ligne, le compte valait toujours 0 et
  // les plafonds ne bloquaient jamais. On compte donc avec le client
  // service_role, borné à un simple comptage sur l'organisation_id que la
  // route appelante a déjà obtenu côté serveur (getMembership) — jamais une
  // valeur venue du navigateur.
  const supabase = createAdminClient();
  const ilYAUneHeure = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const ilYAUnJour = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Un compteur imprécis en cas de deux requêtes strictement simultanées
  // est acceptable ici : l'objectif est de couper une boucle d'abus, pas de
  // garantir une limite exacte à l'unité près.
  const [{ count: nbDerniereHeure }, { count: nbDernierJour }] = await Promise.all([
    supabase
      .from("logs")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .in("type", TYPES_APPELS_IA)
      .gte("created_at", ilYAUneHeure),
    supabase
      .from("logs")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .in("type", TYPES_APPELS_IA)
      .gte("created_at", ilYAUnJour),
  ]);

  if ((nbDerniereHeure ?? 0) >= PLAFOND_PAR_HEURE) {
    return {
      autorise: false,
      message: "Trop d'appels IA sur la dernière heure pour votre équipe. Réessayez un peu plus tard.",
    };
  }

  if ((nbDernierJour ?? 0) >= PLAFOND_PAR_JOUR) {
    return {
      autorise: false,
      message: "Limite quotidienne d'appels IA atteinte pour votre équipe. Réessayez demain.",
    };
  }

  return { autorise: true };
}
