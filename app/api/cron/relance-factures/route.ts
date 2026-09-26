import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPush } from "@/lib/notifications/push";
import { creerNote } from "@/lib/notes";
import { messageRelanceFacture, AVERTISSEMENT_BROUILLON } from "@/lib/relances/templates";

// ============================================================
// Cron de relance sur les factures impayées (11/09) — voir Module 40,
// supabase/schema.sql. Pendant exact de app/api/cron/relance-devis/
// route.ts, côté facturation : mêmes garde-fous (CRON_SECRET fail-closed,
// client admin, traitement parallèle), même principe non négociable.
//
// CE CRON N'ENVOIE JAMAIS RIEN À UN CLIENT. Il crée, pour l'ARTISAN, une
// note contenant un brouillon de relance déjà rédigé (texte fixe, aucun
// appel IA — voir lib/relances/templates.ts). L'artisan ouvre la note, la
// modifie s'il le souhaite, et décide lui-même d'envoyer ou non, par son
// propre moyen. Aucune facture, aucun message, aucune mise en demeure ne
// part de Compyo automatiquement.
//
// Seuils (choix documenté) :
// - Si la facture porte une date d'échéance : 3 jours APRÈS cette
//   échéance. Assez court pour que ce soit utile, assez long pour absorber
//   un virement parti la veille ou un week-end.
// - Sinon (échéance non renseignée, c'est un champ facultatif) : 15 jours
//   après la date d'émission — le délai de paiement légal par défaut
//   entre professionnels étant de 30 jours, relancer à 15 jours sur une
//   facture sans échéance explicite reste prudent et jamais agressif.
//
// Un seul palier, une seule notification par facture (voir Module 40 pour
// le raisonnement) : la suite d'un impayé (téléphone, mise en demeure,
// recouvrement) ne s'automatise pas et reste la décision de l'artisan.
// ============================================================

export const maxDuration = 60;

const JOURS_APRES_ECHEANCE = 3;
const JOURS_SANS_ECHEANCE = 15;

// "demandes(nom_client)" est typé par Supabase comme un tableau (relation
// jointe) — même aplatissement que dans relance-devis/route.ts.
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
    console.error("CRON_SECRET absent — appel du cron de relance factures refusé.");
    return NextResponse.json({ error: "Non configuré" }, { status: 503 });
  }
  const enTete = request.headers.get("authorization");
  if (enTete !== `Bearer ${secretAttendu}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const maintenant = Date.now();

  // Factures encore dues : émises, jamais payées ni annulées, et jamais
  // encore proposées à la relance. Un avoir n'est pas une créance (c'est
  // l'inverse) : exclu. Le filtrage par seuil se fait en mémoire juste
  // après, comme pour les devis.
  const { data: facturesDues, error } = await supabase
    .from("factures")
    .select(
      "id, artisan_id, organisation_id, demande_id, numero, date_emission, date_echeance, demandes(nom_client)"
    )
    .eq("statut", "emise")
    .neq("type", "avoir")
    .is("notifie_relance_le", null);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture des factures" }, { status: 500 });
  }
  if (!facturesDues || facturesDues.length === 0) {
    return NextResponse.json({ proposees: 0 });
  }

  const aNotifier = facturesDues.filter((facture) => {
    if (facture.date_echeance) {
      const joursDepuisEcheance = Math.floor(
        (maintenant - new Date(facture.date_echeance).getTime()) / 86400000
      );
      return joursDepuisEcheance >= JOURS_APRES_ECHEANCE;
    }
    const joursDepuisEmission = Math.floor(
      (maintenant - new Date(facture.date_emission).getTime()) / 86400000
    );
    return joursDepuisEmission >= JOURS_SANS_ECHEANCE;
  });

  if (aNotifier.length === 0) {
    return NextResponse.json({ proposees: 0 });
  }

  // Nom/entreprise pour signer le brouillon — une seule requête pour tous
  // les artisans concernés, jamais une par facture.
  const artisanIds = Array.from(new Set(aNotifier.map((f) => f.artisan_id)));
  const { data: profils } = await supabase
    .from("profils")
    .select("id, nom, entreprise")
    .in("id", artisanIds);
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));

  // Factures indépendantes les unes des autres : Promise.allSettled (pas
  // Promise.all — un échec sur une facture ne doit jamais empêcher les
  // autres d'être traitées), même raisonnement que les autres crons.
  const resultats = await Promise.allSettled(
    aNotifier.map(async (facture) => {
      const nomClient = nomClientDe(facture);
      const profil = profilParId.get(facture.artisan_id);

      const brouillon = messageRelanceFacture({
        nomClient: nomClient ?? "",
        numeroFacture: facture.numero,
        dateEcheance: facture.date_echeance,
        nomArtisan: profil?.nom ?? "",
        entreprise: profil?.entreprise ?? null,
      });

      // rappelA volontairement null : renseigner rappel_a ferait repartir
      // cette note dans app/api/cron/rappels/route.ts, qui enverrait une
      // seconde notification push pour la même chose.
      const { note, erreur: erreurNote } = await creerNote(supabase, {
        organisationId: facture.organisation_id,
        artisanId: facture.artisan_id,
        demandeId: facture.demande_id,
        titre: nomClient
          ? `Facture n° ${facture.numero} impayée — ${nomClient}`
          : `Facture n° ${facture.numero} impayée`,
        description: `${AVERTISSEMENT_BROUILLON}\n\n${brouillon}`,
        importance: "orange",
        rappelA: null,
      });

      // Pas de note = pas de notification : on ne marque pas, le prochain
      // passage réessaiera. Mieux vaut une relance proposée avec un jour de
      // retard qu'un impayé silencieusement oublié.
      if (!note) {
        throw new Error(erreurNote ?? "Note de relance non créée");
      }

      try {
        await envoyerPush(supabase, {
          artisanId: facture.artisan_id,
          titre: "Facture impayée",
          corps: nomClient
            ? `${nomClient} — facture n° ${facture.numero}. Un brouillon de relance vous attend.`
            : `La facture n° ${facture.numero} n'a pas encore été réglée.`,
          // 26/09 — ouvre la feuille « Message au client », relance prête :
          // notification, puis bouton SMS.
          url: `/dashboard/demandes/${facture.demande_id}?message=relancePaiement&facture=${facture.id}`,
        });
      } catch (err) {
        console.error("Push de relance facture non envoyé (la note existe)", facture.id, err);
      }

      // Marqué une fois la NOTIFICATION créée (jamais un envoi au client) :
      // garantit qu'une même facture n'est jamais reproposée.
      await supabase
        .from("factures")
        .update({ notifie_relance_le: new Date().toISOString() })
        .eq("id", facture.id);
    })
  );

  let proposees = 0;
  resultats.forEach((resultat, i) => {
    if (resultat.status === "fulfilled") {
      proposees += 1;
    } else {
      console.error(
        "Relance de facture non proposée (réessai au prochain passage)",
        aNotifier[i].id,
        resultat.reason
      );
    }
  });

  return NextResponse.json({ proposees });
}
