import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ⚠️ Utilise la clé service_role : elle contourne toute la sécurité RLS.
// À importer UNIQUEMENT depuis des routes admin protégées (app/api/admin/*),
// jamais depuis un composant "use client" ni une route publique.
//
// Exceptions connues, chacune justifiée dans son fichier :
//   - app/api/cron/*                          (protégées par CRON_SECRET)
//   - app/api/equipe/inviter et retirer       (réservées au propriétaire,
//     vérifié par la RLS avant tout appel ; les invitations et les
//     équipes n'ont aucune policy d'écriture)
//   - app/api/equipe/rejoindre + lib/equipe/serveur.ts (refonte 03/10) :
//     la personne invitée n'est encore membre de rien, la RLS lui cache
//     donc son invitation. Chaque lecture et chaque écriture sont bornées
//     à SON compte et à SON adresse (celle du compte Auth, pas celle du
//     profil) ; rejoindre exige une session ouverte par un lien reçu dans
//     cette boîte mail. Le mot de passe éventuel passe tel quel à
//     Supabase Auth, jamais stocké ni journalisé.
//   - app/api/notifications/abonner (refonte 03/10) : le Module 52 retire
//     toute écriture d'abonnement push au navigateur (F10). La route écrit
//     au nom de l'utilisateur vérifié, pour son entreprise, avec des
//     champs bornés ; même upsert sur l'endpoint (ordinateur partagé).
//   - app/api/devis-public/[id]/repondre (refonte 03/10) : le Module 52
//     réserve repondre_devis_public au serveur (F11), pour que l'IP et le
//     navigateur de la signature viennent de la route et non de
//     l'appelant. La fonction valide elle-même tout l'état du devis.
//   - lib/notifications/push.ts               (appelée par les crons
//     seulement, avec leur client admin : retrouver le destinataire actif)
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
