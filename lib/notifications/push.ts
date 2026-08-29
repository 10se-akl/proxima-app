import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

// ============================================================
// Service de notifications push — générique, pas spécifique aux notes.
//
// Demande explicite d'Axel : "Ne pas coder quelque chose de spécifique
// uniquement pour les notes. Construire un vrai service de notifications
// qui pourra servir plus tard à d'autres fonctionnalités." envoyerPush()
// ci-dessous ne connaît rien des notes, des projets ou des rappels — elle
// prend juste un artisan, un titre, un corps de message et une URL de
// destination. Aujourd'hui, le seul appelant est app/api/cron/rappels/
// route.ts (rappels de notes), mais n'importe quelle autre fonctionnalité
// future peut l'appeler de la même façon.
//
// Active le scaffolding préparé au PWA Cycle 7 (lib/pwa/notifications.ts,
// public/sw.js) — jusqu'ici rien n'appelait ces briques.
//
// PRÉREQUIS DE DÉPLOIEMENT (à faire une fois, voir rapport de cycle) :
// générer une paire de clés VAPID (`npx web-push generate-vapid-keys`) et
// les définir comme variables d'environnement Vercel :
//   NEXT_PUBLIC_VAPID_CLE_PUBLIQUE (exposée au client, lib/pwa/notifications.ts)
//   VAPID_CLE_PRIVEE (serveur uniquement, jamais exposée)
// Sans ces deux variables, envoyerPush() ne fait rien (retourne
// silencieusement) plutôt que de faire planter l'appelant — cohérent avec
// la philosophie "jamais bloquant" du reste du produit.
// ============================================================

let vapidConfigure = false;

function configurerVapidSiNecessaire(): boolean {
  const clePublique = process.env.NEXT_PUBLIC_VAPID_CLE_PUBLIQUE;
  const clePrivee = process.env.VAPID_CLE_PRIVEE;
  if (!clePublique || !clePrivee) return false;

  if (!vapidConfigure) {
    // Le "mailto:" est requis par la spec Web Push (contact en cas
    // d'abus détecté par un service de push comme celui de Google) —
    // volontairement une adresse générique de support plutôt que celle
    // d'un artisan en particulier.
    webpush.setVapidDetails(
      process.env.VAPID_CONTACT_EMAIL
        ? `mailto:${process.env.VAPID_CONTACT_EMAIL}`
        : "mailto:contact@compyo.fr",
      clePublique,
      clePrivee
    );
    vapidConfigure = true;
  }
  return true;
}

export async function envoyerPush(
  supabase: SupabaseClient,
  params: { artisanId: string; titre: string; corps: string; url?: string }
): Promise<void> {
  if (!configurerVapidSiNecessaire()) return;

  // Respecte le seul interrupteur de préférence (voir Module 27bis) —
  // vérifié ici plutôt que dans chaque appelant, pour que la règle "un
  // artisan qui a désactivé les notifications n'en reçoit plus jamais,
  // même une notification programmée avant qu'il désactive" soit
  // garantie à un seul endroit.
  const { data: profil } = await supabase
    .from("profils")
    .select("notifications_push_actives")
    .eq("id", params.artisanId)
    .single();
  if (profil && profil.notifications_push_actives === false) return;

  const { data: abonnements } = await supabase
    .from("abonnements_push")
    .select("id, endpoint, cle_p256dh, cle_auth")
    .eq("artisan_id", params.artisanId);

  if (!abonnements || abonnements.length === 0) return;

  const charge = JSON.stringify({
    titre: params.titre,
    corps: params.corps,
    url: params.url ?? "/dashboard",
  });

  await Promise.all(
    abonnements.map(async (abonnement) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abonnement.endpoint,
            keys: { p256dh: abonnement.cle_p256dh, auth: abonnement.cle_auth },
          },
          charge
        );
      } catch (err) {
        // 404/410 = l'abonnement n'existe plus côté navigateur (app
        // désinstallée, données de site effacées...) — le supprimer
        // évite de le retenter indéfiniment à chaque futur envoi.
        const statut = (err as { statusCode?: number })?.statusCode;
        if (statut === 404 || statut === 410) {
          await supabase.from("abonnements_push").delete().eq("id", abonnement.id);
        } else {
          console.error("Échec d'envoi d'une notification push :", err);
        }
      }
    })
  );
}
