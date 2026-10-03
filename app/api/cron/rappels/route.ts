import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPush } from "@/lib/notifications/push";

// ============================================================
// Cron d'envoi des rappels de notes — voir Module 27/27bis,
// supabase/schema.sql.
//
// Déclenché par un service EXTERNE (cron-job.org ou équivalent), pas par
// Vercel Cron : le compte Vercel Hobby limite les cron jobs intégrés à
// une exécution par jour, incompatible avec une vérification à la minute
// (voir vercel.json, volontairement vide — retiré le 29/08 après blocage
// de déploiement). N'importe quel appelant externe qui connaît
// CRON_SECRET peut déclencher cette route de la même façon ; voir rapport
// à Axel pour la configuration exacte du service externe.
//
// C'est le SEUL déclencheur de notification PUSH automatique de toute
// l'app (canal complémentaire : voir aussi components/notes/
// PopupRappel.tsx pour la pop-up in-app), et il ne fait qu'une chose :
// chercher les notes dont le rappel programmé par l'artisan lui-même est
// arrivé à échéance, et les notifier — jamais rien d'autre (pas de rappel
// de RDV, pas de relance de devis, voir philosophie dans le brief).
//
// Protégé par CRON_SECRET (en-tête Authorization) — sans ça, n'importe
// qui connaissant l'URL pourrait déclencher des envois. À définir en
// variable d'environnement Vercel (CRON_SECRET, n'importe quelle chaîne
// aléatoire), puis à fournir au service externe comme en-tête
// "Authorization: Bearer <CRON_SECRET>" sur chaque appel programmé.
//
// Sprint Robustesse (30/08) — 🔴 faille corrigée : si CRON_SECRET n'est
// PAS défini en environnement, la route refuse désormais tout appel
// (fail-closed) au lieu de laisser passer sans vérification (fail-open,
// l'ancien comportement). Sans ça, oublier cette variable en prod aurait
// permis à n'importe qui connaissant l'URL de déclencher l'envoi de
// notifications à tous les artisans ET de marquer leurs rappels comme
// "notifiés" (perte définitive du rappel, sans qu'il n'ait jamais été vu).
//
// Utilise le client Supabase "service role" (pas le client serveur
// habituel lié à une session utilisateur) : cette route tourne sans
// utilisateur connecté, elle doit pouvoir lire toutes les organisations.
// SUPABASE_SERVICE_ROLE_KEY ne doit JAMAIS être exposée au client — elle
// n'est utilisée qu'ici, côté serveur, jamais dans un fichier "use client".
// ============================================================

// Audit performance (11/09) — absent jusqu'ici (défaut Vercel, souvent 10s
// en Hobby), alors que les deux autres crons du même projet le déclarent
// déjà à 60. Avec l'envoi désormais parallélisé ci-dessous, une seule
// itération lente ne devrait plus jamais s'approcher de cette limite, mais
// autant rester cohérent avec relance-devis/bilan-mensuel.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secretAttendu = process.env.CRON_SECRET;
  if (!secretAttendu) {
    // Fail-closed : une variable d'environnement manquante ne doit jamais
    // se traduire par une route non protégée.
    console.error("CRON_SECRET absent — appel du cron de rappels refusé.");
    return NextResponse.json({ error: "Non configuré" }, { status: 503 });
  }
  const enTete = request.headers.get("authorization");
  if (enTete !== `Bearer ${secretAttendu}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const maintenant = new Date().toISOString();

  // Notes actives, avec rappel arrivé à échéance, jamais encore notifiées.
  // `notifie_a is null` est le garde-fou anti-double-envoi si le cron
  // tourne deux fois de suite avant que l'écriture précédente soit visible.
  const { data: notesAEnvoyer, error } = await supabase
    .from("notes")
    .select("id, artisan_id, organisation_id, titre, description, demande_id, demandes(nom_client)")
    .eq("statut", "active")
    .not("rappel_a", "is", null)
    .lte("rappel_a", maintenant)
    .is("notifie_a", null);

  if (error) {
    // Constaté le 12/09 : un 500 "Erreur de lecture des rappels" en prod
    // (après un 200 deux minutes plus tôt, même requête) était impossible à
    // diagnostiquer, l'erreur Supabase réelle n'étant journalisée nulle
    // part. Le message renvoyé à l'appelant reste volontairement générique
    // (c'est une route publique), mais la cause part désormais dans les
    // logs Vercel.
    console.error("Cron rappels — lecture des notes échouée :", error);
    return NextResponse.json({ error: "Erreur de lecture des rappels" }, { status: 500 });
  }
  if (!notesAEnvoyer || notesAEnvoyer.length === 0) {
    return NextResponse.json({ envoyees: 0 });
  }

  // Audit performance (11/09) — un for...of séquentiel ici (chaque note
  // attendant la précédente, et envoyerPush() fait déjà 2 requêtes
  // séquentielles à elle seule) fait dépasser maxDuration bien avant "des
  // milliers de lignes" : avec ne serait-ce que 30-50 organisations ayant
  // chacune un rappel en attente au même tick de cron, le temps cumulé
  // approche 60s — au-delà, certains rappels ne sont simplement jamais
  // traités par cette exécution, sans erreur visible nulle part. Les notes
  // sont indépendantes les unes des autres : Promise.allSettled (pas
  // Promise.all, un échec sur une note ne doit jamais empêcher les autres
  // d'être traitées) fait dépendre le temps total du plus lent des envois,
  // pas de leur somme.
  const resultats = await Promise.allSettled(
    notesAEnvoyer.map(async (note) => {
      const nomClient = Array.isArray(note.demandes)
        ? note.demandes[0]?.nom_client
        : (note.demandes as { nom_client?: string } | null)?.nom_client;

      try {
        // Refonte (03/10, duel A) — l'entreprise de la note : si son auteur
        // a quitté l'équipe, le rappel part au propriétaire (voir
        // lib/notifications/push.ts), jamais à l'ancien membre.
        await envoyerPush(supabase, {
          artisanId: note.artisan_id,
          organisationId: note.organisation_id,
          titre: note.titre,
          corps: nomClient ? `Projet : ${nomClient}` : note.description || "Rappel Compyo",
          url: note.demande_id ? `/dashboard/demandes/${note.demande_id}` : "/dashboard/notes",
        });
      } finally {
        // Marqué "notifié" même en cas d'échec d'envoi (abonnement absent,
        // erreur réseau...) : la note reste visible dans "Rappels"/"En
        // retard" sur Aujourd'hui et le centre de notifications de toute
        // façon — seule la notification push, elle, ne se retente pas en
        // boucle indéfiniment.
        await supabase.from("notes").update({ notifie_a: new Date().toISOString() }).eq("id", note.id);
      }
    })
  );

  let envoyees = 0;
  resultats.forEach((resultat, i) => {
    if (resultat.status === "fulfilled") {
      envoyees += 1;
    } else {
      console.error("Échec d'envoi du rappel pour la note", notesAEnvoyer[i].id, resultat.reason);
    }
  });

  return NextResponse.json({ envoyees });
}
