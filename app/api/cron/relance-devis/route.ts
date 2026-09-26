import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPush } from "@/lib/notifications/push";
import { creerNote } from "@/lib/notes";
import {
  messageRelanceDevisJ5,
  messageRelanceDevisJ10,
  AVERTISSEMENT_BROUILLON,
} from "@/lib/relances/templates";

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
    .select(
      "id, artisan_id, organisation_id, demande_id, numero, envoye_le, notifie_relance_j5_le, notifie_relance_j10_le, demandes(nom_client)"
    )
    .eq("statut", "envoye")
    .not("envoye_le", "is", null);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture des devis" }, { status: 500 });
  }
  if (!devisEnAttente || devisEnAttente.length === 0) {
    return NextResponse.json({ proposees: 0 });
  }

  // Le palier le plus élevé déjà atteint et pas encore notifié gagne — si
  // le cron n'a pas tourné depuis un moment et qu'on saute directement à
  // J+12, on envoie UNE notification (le palier 10, le plus pertinent),
  // jamais un rattrapage des deux à la suite. Calculé ici pour ne garder,
  // avant le parallélisme ci-dessous, que les devis qui ont réellement
  // quelque chose à notifier.
  const aNotifier = devisEnAttente
    .map((devis) => {
      const joursDepuis = Math.floor(
        (maintenant - new Date(devis.envoye_le as string).getTime()) / 86400000
      );
      let palier: 5 | 10 | null = null;
      if (joursDepuis >= JOURS_PALIER_2 && !devis.notifie_relance_j10_le) {
        palier = 10;
      } else if (joursDepuis >= JOURS_PALIER_1 && !devis.notifie_relance_j5_le) {
        palier = 5;
      }
      return palier ? { devis, joursDepuis, palier } : null;
    })
    .filter((item): item is { devis: (typeof devisEnAttente)[number]; joursDepuis: number; palier: 5 | 10 } => item !== null);

  // Le brouillon est signé au nom de l'artisan : on récupère nom/entreprise
  // en UNE requête pour tous les artisans concernés, plutôt qu'une par
  // devis (voir l'audit performance du 11/09 sur les crons).
  const artisanIds = Array.from(new Set(aNotifier.map((a) => a.devis.artisan_id)));
  const { data: profils } = await supabase
    .from("profils")
    .select("id, nom, entreprise")
    .in("id", artisanIds);
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));

  // Audit performance (11/09) — même correctif que app/api/cron/rappels/
  // route.ts : un for...of séquentiel ici fait dépasser maxDuration bien
  // avant "des milliers de lignes" (une trentaine d'organisations avec
  // chacune un devis à relancer au même tick suffit). Les devis sont
  // indépendants les uns des autres : Promise.allSettled fait dépendre le
  // temps total du plus lent des envois, pas de leur somme.
  const resultats = await Promise.allSettled(
    aNotifier.map(async ({ devis, joursDepuis, palier }) => {
      const nomClient = nomClientDe(devis);
      const profil = profilParId.get(devis.artisan_id);

      // Le brouillon est un TEXTE FIXE à trous (voir lib/relances/
      // templates.ts) — aucun appel IA, donc aucun montant ni délai ne peut
      // être inventé dans un message destiné à un client.
      const brouillon =
        palier === 5
          ? messageRelanceDevisJ5({
              nomClient: nomClient ?? "",
              numeroDevis: devis.numero,
              joursDepuis,
              nomArtisan: profil?.nom ?? "",
              entreprise: profil?.entreprise ?? null,
            })
          : messageRelanceDevisJ10({
              nomClient: nomClient ?? "",
              numeroDevis: devis.numero,
              joursDepuis,
              nomArtisan: profil?.nom ?? "",
              entreprise: profil?.entreprise ?? null,
            });

      // La note EST la notification : elle apparaît dans "Notes", sur la
      // fiche projet et dans le centre de notifications, elle survit à un
      // téléphone éteint (contrairement au push seul), et elle contient le
      // brouillon complet, modifiable. Rien n'est envoyé au client ici.
      //
      // rappelA VOLONTAIREMENT null : renseigner rappel_a ferait repartir
      // cette note dans app/api/cron/rappels/route.ts, qui enverrait une
      // SECONDE notification push pour la même chose.
      const { note, erreur: erreurNote } = await creerNote(supabase, {
        organisationId: devis.organisation_id,
        artisanId: devis.artisan_id,
        demandeId: devis.demande_id,
        titre: nomClient
          ? `Relancer ${nomClient} — devis n° ${devis.numero} sans réponse`
          : `Relancer un devis sans réponse (n° ${devis.numero})`,
        description: `${AVERTISSEMENT_BROUILLON}\n\n${brouillon}`,
        importance: "orange",
        rappelA: null,
      });

      // Note non créée = notification inexistante : on NE MARQUE PAS la
      // colonne, pour que le prochain passage du cron réessaie. Mieux vaut
      // une relance proposée avec un jour de retard qu'un devis oublié.
      if (!note) {
        throw new Error(erreurNote ?? "Note de relance non créée");
      }

      // Push = simple rappel vers la note qui existe déjà. Son échec
      // (abonnement absent, navigateur qui a révoqué la permission...) ne
      // doit pas faire recommencer tout le processus demain : la note,
      // elle, est bien là.
      try {
        await envoyerPush(supabase, {
          artisanId: devis.artisan_id,
          titre: "Devis toujours sans réponse",
          corps: nomClient
            ? `${nomClient} — envoyé il y a ${joursDepuis} jours. Un brouillon de relance vous attend.`
            : `Un devis envoyé il y a ${joursDepuis} jours reste sans réponse.`,
          // 26/09 — ouvre la feuille « Message au client », relance prête.
          url: `/dashboard/demandes/${devis.demande_id}?message=relanceDevis&devis=${devis.id}`,
        });
      } catch (err) {
        console.error("Push de relance non envoyé (la note existe)", devis.id, err);
      }

      // Marqué une fois la NOTIFICATION créée (pas un envoi au client — il
      // n'y en a jamais ici) : garantit qu'un même devis n'est jamais
      // proposé deux fois au même palier.
      const colonne = palier === 5 ? "notifie_relance_j5_le" : "notifie_relance_j10_le";
      await supabase
        .from("devis")
        .update({ [colonne]: new Date().toISOString() })
        .eq("id", devis.id);
    })
  );

  // "proposees" et non "envoyees" : ce cron ne peut, par construction, rien
  // envoyer à un client — il prépare des brouillons que l'artisan décide
  // d'envoyer ou non. Le nom du compteur doit dire la vérité, y compris
  // dans les logs d'un service de cron externe.
  let proposees = 0;
  resultats.forEach((resultat, i) => {
    if (resultat.status === "fulfilled") {
      proposees += 1;
    } else {
      console.error(
        "Relance de devis non proposée (réessai au prochain passage)",
        aNotifier[i].devis.id,
        resultat.reason
      );
    }
  });

  return NextResponse.json({ proposees });
}
