import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPush } from "@/lib/notifications/push";

// ============================================================
// Cron de relance sur les devis envoyés sans réponse — voir Module 36,
// supabase/schema.sql.
//
// Recherche terrain (09/09) : le résumé de fin de journée
// (app/api/ai/resume-journee/route.ts) détecte déjà ces devis, et le
// bouton "Suggérer une relance" sur la fiche projet (app/dashboard/
// demandes/[id]/page.tsx, genererRelance) rédige déjà le message par IA —
// mais tout ça restait PASSIF : rien ne poussait l'info vers l'artisan, il
// fallait qu'il pense à ouvrir l'app. Cette route ne fait qu'ajouter le
// déclencheur proactif qui manquait ; elle ne rédige ni n'envoie RIEN au
// client elle-même — juste une notification à l'ARTISAN, qui reste seul
// décideur d'aller (ou non) rédiger et envoyer sa relance, même principe
// que partout ailleurs dans Compyo ("l'IA propose, l'artisan valide").
//
// Deux paliers seulement (J+5, J+10, voir JOURS_PALIER_1/2 ci-dessous),
// jamais plus : au-delà, on considère que l'artisan a vu l'info (dashboard,
// notification) et a fait son choix — le mitrailler ne le ferait pas
// changer d'avis, juste le fatiguer un peu plus (voir la recherche sur la
// charge mentale des artisans du BTP qui a motivé cette fonctionnalité).
//
// Même infrastructure et mêmes garde-fous que app/api/cron/rappels/
// route.ts, volontairement séparée de cette route (déjà documentée comme
// "seul déclencheur de rappels de notes, jamais rien d'autre") plutôt que
// d'y ajouter une responsabilité différente : protection CRON_SECRET
// fail-closed, client admin (aucun utilisateur connecté sur un cron),
// respect de la préférence "notifications désactivées" gérée en interne
// par envoyerPush() (aucun code à dupliquer ici pour ça).
// ============================================================

export const maxDuration = 60;

const JOURS_PALIER_1 = 5;
const JOURS_PALIER_2 = 10;

// "demandes(nom_client)" est typé par Supabase comme un tableau (relation
// jointe), même si demande_id ne pointe jamais vers plus d'un projet —
// même flatten que resume-journee/route.ts.
function nomClientDe(item: unknown): string | undefined {
  const demandes = (item as { demandes?: { nom_client?: string } | { nom_client?: string }[] })
    ?.demandes;
  const demande = Array.isArray(demandes) ? demandes[0] : demandes;
  return demande?.nom_client;
}

export async function GET(request: NextRequest) {
  const secretAttendu = process.env.CRON_SECRET;
  if (!secretAttendu) {
    // Fail-closed : une variable d'environnement manquante ne doit jamais
    // se traduire par une route non protégée.
    console.error("CRON_SECRET absent — appel du cron de relance devis refusé.");
    return NextResponse.json({ error: "Non configuré" }, { status: 503 });
  }
  const enTete = request.headers.get("authorization");
  if (enTete !== `Bearer ${secretAttendu}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const maintenant = Date.now();

  // Tous les devis "envoyé" avec une date d'envoi — le filtrage par palier
  // (voir plus bas) se fait en mémoire, le volume par organisation reste
  // largement raisonnable pour ça.
  const { data: devisEnAttente, error } = await supabase
    .from("devis")
    .select("id, artisan_id, demande_id, envoye_le, notifie_relance_j5_le, notifie_relance_j10_le, demandes(nom_client)")
    .eq("statut", "envoye")
    .not("envoye_le", "is", null);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture des devis" }, { status: 500 });
  }
  if (!devisEnAttente || devisEnAttente.length === 0) {
    return NextResponse.json({ envoyees: 0 });
  }

  let envoyees = 0;
  for (const devis of devisEnAttente) {
    const joursDepuis = Math.floor(
      (maintenant - new Date(devis.envoye_le as string).getTime()) / 86400000
    );

    // Le palier le plus élevé déjà atteint et pas encore notifié gagne —
    // si le cron n'a pas tourné depuis un moment et qu'on saute
    // directement à J+12, on envoie UNE notification (le palier 10, le
    // plus pertinent), jamais un rattrapage des deux à la suite.
    let palier: 5 | 10 | null = null;
    if (joursDepuis >= JOURS_PALIER_2 && !devis.notifie_relance_j10_le) {
      palier = 10;
    } else if (joursDepuis >= JOURS_PALIER_1 && !devis.notifie_relance_j5_le) {
      palier = 5;
    }
    if (!palier) continue;

    const nomClient = nomClientDe(devis);

    try {
      await envoyerPush(supabase, {
        artisanId: devis.artisan_id,
        titre: "Devis toujours sans réponse",
        corps: nomClient
          ? `${nomClient} — envoyé il y a ${joursDepuis} jours. Une relance ?`
          : `Un devis envoyé il y a ${joursDepuis} jours reste sans réponse.`,
        url: `/dashboard/demandes/${devis.demande_id}`,
      });
      envoyees += 1;
    } catch (err) {
      console.error("Échec d'envoi de la relance pour le devis", devis.id, err);
    } finally {
      // Marqué comme notifié même en cas d'échec d'envoi (abonnement
      // absent, erreur réseau...) — même raisonnement que rappels/route.ts :
      // le devis reste de toute façon visible dans le résumé de fin de
      // journée, seule la notification push ne se retente pas en boucle.
      const colonne = palier === 5 ? "notifie_relance_j5_le" : "notifie_relance_j10_le";
      await supabase
        .from("devis")
        .update({ [colonne]: new Date().toISOString() })
        .eq("id", devis.id);
    }
  }

  return NextResponse.json({ envoyees });
}
