import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ⚠️ Utilise la clé service_role : elle contourne toute la sécurité RLS.
// À importer UNIQUEMENT depuis des routes admin protégées (app/api/admin/*),
// jamais depuis un composant "use client" ni une route publique.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
