import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enregistrerLog } from "@/lib/logs";

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

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
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
    const [{ data: demandes }, { data: devisList }, { data: planningComplet }] =
      await Promise.all([
        supabase
          .from("demandes")
          .select("id, nom_client, statut, priorite, created_at")
          .eq("artisan_id", user.id),
        supabase
          .from("devis")
          .select("id, demande_id, statut, envoye_le, demandes(nom_client)")
          .eq("artisan_id", user.id),
        supabase
          .from("evenements_planning")
          .select("demande_id, date_heure")
          .eq("artisan_id", user.id)
          .eq("type", "rendez_vous")
          .neq("statut", "annule"),
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
      const nom = (d as { demandes?: { nom_client?: string } }).demandes?.nom_client ?? "un client";
      lignes.push(`📤 Devis de ${nom} prêt, mais toujours pas envoyé.`);
    });

    devisEnAttente.slice(0, MAX_PAR_CATEGORIE).forEach((d) => {
      const nom = (d as { demandes?: { nom_client?: string } }).demandes?.nom_client ?? "un client";
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
