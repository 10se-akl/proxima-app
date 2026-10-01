import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ⚠️ Utilise la clé service_role : elle contourne toute la sécurité RLS.
// À importer UNIQUEMENT depuis des routes admin protégées (app/api/admin/*),
// jamais depuis un composant "use client" ni une route publique.
//
// Exceptions connues, chacune justifiée dans son fichier :
//   - app/api/cron/*                          (protégées par CRON_SECRET)
//   - app/api/equipe/inviter                  (réservée au propriétaire)
//   - lib/limiteIA.ts                         (comptage seul, sur un
//     organisation_id obtenu côté serveur : "logs" n'a pas de SELECT RLS)
//   - lib/candidatures/creerCompteCandidat.ts (Module 43 : la demande
//     d'accès crée le compte « en attente » — seul appel public, borné
//     à des champs privilégiés constants)
// En ajouter une autre demande la même justification écrite.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
