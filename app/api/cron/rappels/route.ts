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
    return NextResponse.json({ error: "Erreur de lecture des rappels" }, { status: 500 });
  }
  if (!notesAEnvoyer || notesAEnvoyer.length === 0) {
    return NextResponse.json({ envoyees: 0 });
  }

  let envoyees = 0;
  for (const note of notesAEnvoyer) {
    const nomClient = Array.isArray(note.demandes)
      ? note.demandes[0]?.nom_client
      : (note.demandes as { nom_client?: string } | null)?.nom_client;

    try {
      await envoyerPush(supabase, {
        artisanId: note.artisan_id,
        titre: note.titre,
        corps: nomClient ? `Projet : ${nomClient}` : note.description || "Rappel Compyo",
        url: note.demande_id ? `/dashboard/demandes/${note.demande_id}` : "/dashboard/notes",
      });
      envoyees += 1;
    } catch (err) {
      console.error("Échec d'envoi du rappel pour la note", note.id, err);
    } finally {
      // Marqué "notifié" même en cas d'échec d'envoi (abonnement absent,
      // erreur réseau...) : la note reste visible dans "Rappels"/"En
      // retard" sur Aujourd'hui et le centre de notifications de toute
      // façon — seule la notification push, elle, ne se retente pas en
      // boucle indéfiniment.
      await supabase.from("notes").update({ notifie_a: new Date().toISOString() }).eq("id", note.id);
    }
  }

  return NextResponse.json({ envoyees });
}
