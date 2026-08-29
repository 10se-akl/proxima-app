import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enregistrerLog } from "@/lib/logs";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation } from "@/lib/notes";

// Pas d'appel IA ici, volontairement : le contenu de ce résumé est
// entièrement factuel (qui a contacté, quel devis attend, quel projet
// urgent n'a pas de rendez-vous) — de la donnée déjà en base, juste
// regroupée. Un artisan de 55 ans qui lit "Mme Dupond — urgent, toujours
// pas de rendez-vous" n'a besoin d'aucune reformulation par une IA, et ça
// ne dépend d'aucun crédit API : ça marche toujours, même à 0 appel Claude
// restant. Ce que l'artisan sait déjà (le déroulé du chantier qu'il vient
// de faire) n'a pas sa place ici — seulement ce qui a besoin d'une action.
const NB_JOURS_RELANCE_MIN = 1;
const MAX_PAR_CATEGORIE = 4;

// "demandes(nom_client)" est typé par Supabase comme un tableau (relation
// jointe), même si demande_id ne pointe jamais vers plus d'un projet — on
// passe par "unknown" pour aplatir sans conversion de type hasardeuse.
function nomClientDe(item: unknown): string | undefined {
  const demandes = (item as { demandes?: { nom_client?: string } | { nom_client?: string }[] })
    ?.demandes;
  const demande = Array.isArray(demandes) ? demandes[0] : demandes;
  return demande?.nom_client;
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const organisationId = await getOrganisationId(supabase, user.id);
  if (!organisationId) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }

  try {
    const debutAujourdhui = new Date();
    debutAujourdhui.setHours(0, 0, 0, 0);
    const finAujourdhui = new Date();
    finAujourdhui.setHours(23, 59, 59, 999);
    const maintenant = new Date();

    // On récupère TOUT le planning (pas seulement le futur) pour pouvoir
    // distinguer deux situations bien différentes : "aucun rendez-vous n'a
    // jamais été prévu" et "un rendez-vous a eu lieu, rien de prévu après".
    // Le bug remonté était exactement ça : le résumé disait "toujours pas
    // de rendez-vous prévu" pour un projet où un rendez-vous avait déjà eu
    // lieu — vrai au sens strict (rien de FUTUR), mais trompeur à la
    // lecture, comme si aucun rendez-vous n'avait jamais existé.
    const [{ data: demandes }, { data: devisList }, { data: planningComplet }, notesAvecRappel] =
      await Promise.all([
        supabase
          .from("demandes")
          .select("id, nom_client, statut, priorite, created_at")
          .eq("organisation_id", organisationId),
        supabase
          .from("devis")
          .select("id, demande_id, statut, envoye_le, demandes(nom_client)")
          .eq("organisation_id", organisationId),
        supabase
          .from("evenements_planning")
          .select("demande_id, date_heure")
          .eq("organisation_id", organisationId)
          .eq("type", "rendez_vous")
          .neq("statut", "annule"),
        // Notes actives avec rappel (29/08, point 4 du brief) — toujours
        // la même fonction de lecture que la page Notes/Aujourd'hui/centre
        // de notifications, voir lib/notes/index.ts.
        listerNotesActivesOrganisation(supabase, organisationId, { avecRappelUniquement: true }),
      ]);

    const idsAvecRdvFutur = new Set(
      (planningComplet ?? [])
        .filter((e) => new Date(e.date_heure) >= maintenant)
        .map((e) => e.demande_id)
        .filter(Boolean)
    );
    const idsAvecRdvPasse = new Set(
      (planningComplet ?? [])
        .filter((e) => new Date(e.date_heure) < maintenant)
        .map((e) => e.demande_id)
        .filter(Boolean)
    );
    const projets = demandes ?? [];
    const devis = devisList ?? [];

    // 1. Nouveaux contacts / projets créés aujourd'hui — ce que l'artisan
    // n'a pas forcément vu s'il a passé sa journée sur le chantier plutôt
    // que sur l'app.
    const nouveauxAujourdhui = projets.filter((p) => {
      const cree = new Date(p.created_at);
      return cree >= debutAujourdhui && cree <= finAujourdhui;
    });

    // 2. Projets encore au tout début (pas de devis généré) et sans aucun
    // rendez-vous prévu — ils ne bougeront pas tout seuls.
    const sansDevisNiRdv = projets.filter(
      (p) =>
        (p.statut === "nouveau" || p.statut === "analyse") &&
        !idsAvecRdvFutur.has(p.id)
    );

    // 3. Devis prêts (validés) mais jamais envoyés au client.
    const devisPrets = devis.filter((d) => d.statut === "a_valider");

    // 4. Devis envoyés, toujours sans réponse — trié par ancienneté.
    const devisEnAttente = devis
      .filter((d) => d.statut === "envoye" && d.envoye_le)
      .map((d) => ({
        ...d,
        joursDepuis: Math.floor(
          (maintenant.getTime() - new Date(d.envoye_le as string).getTime()) / 86400000
        ),
      }))
      .filter((d) => d.joursDepuis >= NB_JOURS_RELANCE_MIN)
      .sort((a, b) => b.joursDepuis - a.joursDepuis);

    // 5. Projets urgents sans rendez-vous à venir — le plus important à ne
    // pas laisser traîner.
    const urgentsSansRdv = projets.filter(
      (p) => p.priorite === "urgent" && p.statut !== "termine" && !idsAvecRdvFutur.has(p.id)
    );

    const lignes: string[] = [];

    // Notes avec rappel en retard ou prévu aujourd'hui — priorité la plus
    // haute dans le résumé : ce sont des rappels que l'artisan s'est
    // explicitement donnés à lui-même (point 4 du brief), pas une
    // suggestion de l'app.
    const notesEnRetard = notesAvecRappel.filter(
      (n) => new Date(n.rappel_a as string).getTime() < maintenant.getTime()
    );
    const notesAujourdhui = notesAvecRappel.filter((n) => {
      const t = new Date(n.rappel_a as string).getTime();
      return t >= maintenant.getTime() && t <= finAujourdhui.getTime();
    });

    notesEnRetard.slice(0, MAX_PAR_CATEGORIE).forEach((n) => {
      lignes.push(
        `🔴 ${n.titre}${n.demandes?.nom_client ? ` — ${n.demandes.nom_client}` : ""} — rappel en retard.`
      );
    });
    notesAujourdhui.slice(0, MAX_PAR_CATEGORIE).forEach((n) => {
      const heure = new Date(n.rappel_a as string).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      lignes.push(
        `📝 ${n.titre}${n.demandes?.nom_client ? ` — ${n.demandes.nom_client}` : ""} — rappel ${heure}.`
      );
    });

    if (nouveauxAujourdhui.length > 0) {
      nouveauxAujourdhui.slice(0, MAX_PAR_CATEGORIE).forEach((p) => {
        lignes.push(`🆕 ${p.nom_client} vous a contacté aujourd'hui — projet créé.`);
      });
    }

    urgentsSansRdv.slice(0, MAX_PAR_CATEGORIE).forEach((p) => {
      lignes.push(
        idsAvecRdvPasse.has(p.id)
          ? `⚠️ ${p.nom_client} — dossier urgent, le dernier rendez-vous est passé, rien de prévu ensuite.`
          : `⚠️ ${p.nom_client} — dossier urgent, toujours pas de rendez-vous prévu.`
      );
    });

    devisPrets.slice(0, MAX_PAR_CATEGORIE).forEach((d) => {
      const nom = nomClientDe(d) ?? "un client";
      lignes.push(`📤 Devis de ${nom} prêt, mais toujours pas envoyé.`);
    });

    devisEnAttente.slice(0, MAX_PAR_CATEGORIE).forEach((d) => {
      const nom = nomClientDe(d) ?? "un client";
      lignes.push(
        `📄 Devis envoyé à ${nom} depuis ${d.joursDepuis} jour${d.joursDepuis > 1 ? "s" : ""}, sans réponse.`
      );
    });

    sansDevisNiRdv.slice(0, MAX_PAR_CATEGORIE).forEach((p) => {
      lignes.push(
        idsAvecRdvPasse.has(p.id)
          ? `📝 ${p.nom_client} — visite effectuée, toujours pas de devis.`
          : `📝 ${p.nom_client} — projet créé, pas encore de devis ni de rendez-vous.`
      );
    });

    await enregistrerLog(supabase, {
      artisanId: user.id,
      organisationId,
      type: "resume_journee",
      contexte: undefined,
    });

    return NextResponse.json({ lignes });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Le résumé n'a pas pu être préparé. Réessayez." },
      { status: 500 }
    );
  }
}
