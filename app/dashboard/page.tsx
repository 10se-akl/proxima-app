import { createClient } from "@/lib/supabase/server";
import { VueAccueil, type ActionAccueil, type LigneASuivre } from "@/components/accueil/VueAccueil";
import type { ElementJour } from "@/components/accueil/ListeAujourdhui";
import type { ElementARegler } from "@/components/accueil/ARegler";
import type { Projet } from "@/types";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation } from "@/lib/notes";
import { aujourdhuiParis, minuitParis } from "@/lib/moisParis";
import { aplatirClient, calculerArgent, JOURS_PAUSE_RELANCE } from "@/lib/argent";

// ============================================================
// L'accueil (26/09 — « moins mais mieux », lot B ; refonte 03/10 — duel C,
// lot 4 : devant / derrière).
//
// Une seule question : qu'est-ce que je dois faire ? Une ligne n'existe
// que dans trois cas :
//   (a) son heure va passer aujourd'hui            → Aujourd'hui (devant) ;
//   (b) son heure est passée sans réponse          → À régler (derrière) ;
//   (c) un dossier attend un geste de l'artisan :
//       cadrer, chiffrer, relire, envoyer, relancer → À suivre.
// Le reste (un devis envoyé il y a trois jours, une facture pas encore
// échue) vit dans Devis, Factures ou Argent.
//
// « Maintenant », trois règles, dans l'ordre : le rendez-vous en cours
// (jusqu'à sa fin estimée) ; sinon le prochain rendez-vous du jour ;
// sinon, avant 17 h, la première ligne d'« À suivre ». Ce qu'il montre
// n'est jamais répété plus bas. Dès 17 h, quand rien n'est ni devant ni
// derrière, « Tout est réglé. » prend sa place, avec demain.
//
// Une relance préparée fait taire sa ligne pendant sept jours (la trace
// « message_prepare » du carnet) : sans ça, relancer ne retirait rien.
// Cette requête remplace celle du bilan du soir, qui a quitté l'accueil.
// ============================================================

const HEURE_DU_SOIR = 17;
// Un chantier déborde souvent sur l'horaire prévu : un rendez-vous ou une
// tâche ne passe « derrière » qu'une heure après sa fin estimée.
const MARGE_CONFIRMATION_MIN = 60;
const JOUR_MS = 86400000;

// Sans ça, Next.js peut servir une version mise en cache de cette page en
// revenant dessus après avoir changé d'onglet ou de page (cache de routeur
// côté navigateur, ~30 secondes par défaut) — ce qui donnait l'impression
// qu'une confirmation déjà traitée (rendez-vous, chantier terminé...)
// n'avait jamais été enregistrée. Cette page dépend d'un état qui change à
// chaque clic : elle doit toujours être recalculée, jamais servie en cache.
export const dynamic = "force-dynamic";

const HEURE_PARIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "2-digit" });
const heureCourte = (iso: string) => HEURE_PARIS.format(new Date(iso)).replace(":", "h").replace(/h00$/, "h");
const CLE_JOUR = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
const JOUR_SEMAINE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });
const DATE_COURTE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });

/** « 14h », « hier 14h », « lun. 14h », « 29 sept. » : quand c'était. */
function quand(iso: string, maintenant: Date): string {
  const d = new Date(iso);
  const ecart = Math.round((Date.parse(CLE_JOUR.format(maintenant)) - Date.parse(CLE_JOUR.format(d))) / JOUR_MS);
  if (ecart <= 0) return heureCourte(iso);
  if (ecart === 1) return `hier ${heureCourte(iso)}`;
  if (ecart < 7) return `${JOUR_SEMAINE.format(d)} ${heureCourte(iso)}`;
  return DATE_COURTE.format(d);
}

export default async function DashboardHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  const maintenant = new Date();
  const t = maintenant.getTime();

  // Le jour à Paris. Refonte (02/10) — le serveur tourne en UTC : une seule
  // définition du jour pour tout l'accueil, celle de Paris.
  const jourParis = aujourdhuiParis(maintenant);
  const debutJourParis = minuitParis(jourParis.annee, jourParis.mois, jourParis.jour);
  const finJourParis = minuitParis(jourParis.annee, jourParis.mois, jourParis.jour + 1);
  const finDemainParis = minuitParis(jourParis.annee, jourParis.mois, jourParis.jour + 2);
  const heureParis = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).format(maintenant)
  );
  const estLeSoir = heureParis >= HEURE_DU_SOIR;

  // Requêtes indépendantes : en parallèle, ce qui compte vraiment sur un
  // chantier avec un réseau mobile faible.
  const [
    { data: profil },
    { data: projets },
    { data: devisList },
    { data: evenementsAujourdhui },
    { data: passesBrut },
    { data: rdvConfirmesBrut },
    { data: evenementsFutursBrut },
    { data: journalEvenementsBrut },
    { data: facturesDuesBrut },
    notesAvecRappel,
    { data: relancesBrut },
    { data: premierRdvDemainBrut },
  ] = await Promise.all([
    supabase.from("profils").select("nom").eq("id", user?.id).single(),
    supabase.from("demandes").select("*").eq("organisation_id", organisationId),
    supabase
      .from("devis")
      .select("id, statut, numero, envoye_le, created_at, total_estime, demande_id, artisan_id, demandes(nom_client)")
      .eq("organisation_id", organisationId),
    // Refonte (03/10) : l'adresse, pour « Y aller » dans Maintenant.
    supabase
      .from("evenements_planning")
      .select("id, type, statut, titre, demande_id, date_heure, duree_minutes, artisan_id, demandes(nom_client, adresse_client)")
      .eq("organisation_id", organisationId)
      .gte("date_heure", debutJourParis.toISOString())
      .lt("date_heure", finJourParis.toISOString())
      .eq("statut", "a_faire")
      .order("date_heure", { ascending: true }),
    // Les événements passés jamais confirmés (ni « fait », ni « annulé »),
    // sans horizon : on ne suppose rien, on demande.
    supabase
      .from("evenements_planning")
      .select("id, type, titre, demande_id, date_heure, duree_minutes, artisan_id, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .eq("statut", "a_faire")
      .lt("date_heure", maintenant.toISOString())
      .order("date_heure", { ascending: false }),
    // Rendez-vous déjà confirmés « fait » : pour « Chantier terminé ? ».
    supabase
      .from("evenements_planning")
      .select("demande_id, date_heure")
      .eq("organisation_id", organisationId)
      .eq("type", "rendez_vous")
      .eq("statut", "termine"),
    supabase
      .from("evenements_planning")
      .select("demande_id")
      .eq("organisation_id", organisationId)
      .neq("statut", "annule")
      .gte("date_heure", maintenant.toISOString()),
    // Journal chantier vocal (06/09) — second signal de clôture, et les
    // « Pas encore » (duel C, lot 3).
    supabase
      .from("evenements_projet")
      .select("demande_id, metadata, type, created_at")
      .eq("organisation_id", organisationId)
      .in("type", ["journal_chantier_interprete", "chantier_pas_termine"])
      .order("created_at", { ascending: false }),
    supabase
      .from("factures")
      .select("id, numero, demande_id, statut, type, total_ttc, date_emission, date_echeance, artisan_id, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .eq("statut", "emise")
      .neq("type", "avoir"),
    organisationId
      ? listerNotesActivesOrganisation(supabase, organisationId, { avecRappelUniquement: true })
      : Promise.resolve([]),
    // Les relances préparées depuis une semaine : la ligne se tait.
    supabase
      .from("evenements_projet")
      .select("demande_id, created_at, metadata")
      .eq("organisation_id", organisationId)
      .eq("type", "message_prepare")
      .gte("created_at", new Date(t - JOURS_PAUSE_RELANCE * JOUR_MS).toISOString()),
    // Le premier rendez-vous de demain : la ligne « Demain » du repos.
    supabase
      .from("evenements_planning")
      .select("date_heure, titre, demandes(nom_client, adresse_client)")
      .eq("organisation_id", organisationId)
      .eq("type", "rendez_vous")
      .eq("statut", "a_faire")
      .gte("date_heure", finJourParis.toISOString())
      .lt("date_heure", finDemainParis.toISOString())
      .order("date_heure", { ascending: true })
      .limit(1),
  ]);

  const devisListPlat = aplatirClient(devisList);
  const duJourPlat = aplatirClient(evenementsAujourdhui);
  const passesPlat = aplatirClient(passesBrut);
  const facturesDues = aplatirClient(facturesDuesBrut);

  const listeProjets = (projets as Projet[] | null) ?? [];
  // Un chantier marqué « terminé » disparaît de toute section de l'accueil
  // (ses factures impayées restent dans Argent).
  const idsProjetsTermines = new Set(listeProjets.filter((p) => p.statut === "termine").map((p) => p.id));
  const actif = (demandeId: string | null) => !demandeId || !idsProjetsTermines.has(demandeId);
  const fiche = (demandeId: string | null, repli: string) => (demandeId ? `/dashboard/demandes/${demandeId}` : repli);
  const finEstimee = (e: { type: string; date_heure: string; duree_minutes?: number | null }) =>
    Date.parse(e.date_heure) + (e.duree_minutes ?? (e.type === "rendez_vous" ? 60 : 15)) * 60000;

  // ---- Derrière : passé d'une heure après sa fin, sans réponse ----------
  const evenementsDerriere = passesPlat.filter((e) => finEstimee(e) + MARGE_CONFIRMATION_MIN * 60000 < t);
  const idsDerriere = new Set(evenementsDerriere.map((e) => e.id));

  // « Chantier terminé ? » — Refonte (02/10, duel C lot 3) : seulement
  // après un rendez-vous fait APRÈS l'envoi d'un devis (ou deux
  // comptes-rendus vocaux qui disent que c'est fini), plus rien de prévu,
  // et pas de « Pas encore » plus récent.
  const premierEnvoiDevis = new Map<string, number>();
  for (const d of devisListPlat) {
    if (!d.demande_id || !d.envoye_le) continue;
    const envoi = Date.parse(d.envoye_le);
    const actuel = premierEnvoiDevis.get(d.demande_id);
    if (actuel === undefined || envoi < actuel) premierEnvoiDevis.set(d.demande_id, envoi);
  }
  const dernierRdvFait = new Map<string, number>();
  for (const e of rdvConfirmesBrut ?? []) {
    if (!e.demande_id) continue;
    const quandFait = Date.parse(e.date_heure);
    const envoi = premierEnvoiDevis.get(e.demande_id);
    if (envoi === undefined || quandFait < envoi) continue;
    if (quandFait > (dernierRdvFait.get(e.demande_id) ?? 0)) dernierRdvFait.set(e.demande_id, quandFait);
  }
  const dernierPasEncore = new Map<string, number>();
  for (const e of journalEvenementsBrut ?? []) {
    if (e.type !== "chantier_pas_termine" || !e.demande_id || dernierPasEncore.has(e.demande_id)) continue;
    dernierPasEncore.set(e.demande_id, Date.parse(e.created_at)); // trié du plus récent au plus ancien
  }
  const idsAvecEvenementFutur = new Set((evenementsFutursBrut ?? []).map((e) => e.demande_id).filter(Boolean));
  const SEUIL_SIGNAUX_CLOTURE = 2;
  const signauxParProjet = new Map<string, { signaux: boolean[]; dernier: number }>();
  for (const e of journalEvenementsBrut ?? []) {
    if (!e.demande_id || e.type !== "journal_chantier_interprete") continue;
    const s = signauxParProjet.get(e.demande_id) ?? { signaux: [], dernier: Date.parse(e.created_at) };
    s.signaux.push(Boolean((e.metadata as { chantier_semble_termine?: boolean } | null)?.chantier_semble_termine));
    signauxParProjet.set(e.demande_id, s);
  }
  // Le moment du fait nouveau qui pose la question, ou null.
  const questionChantier = (id: string): number | null => {
    const pasEncore = dernierPasEncore.get(id) ?? 0;
    const rdv = dernierRdvFait.get(id);
    if (rdv !== undefined && rdv > pasEncore) return rdv;
    const s = signauxParProjet.get(id);
    if (s && s.signaux.length >= SEUIL_SIGNAUX_CLOTURE && s.signaux.slice(0, SEUIL_SIGNAUX_CLOTURE).every(Boolean) && s.dernier > pasEncore)
      return s.dernier;
    return null;
  };

  const aRegler: ElementARegler[] = [
    ...notesAvecRappel
      .filter((n) => Date.parse(n.rappel_a as string) < t)
      .map((n) => ({
        cle: `note-${n.id}`,
        genre: "note" as const,
        id: n.id,
        date: n.rappel_a as string,
        principal: n.titre,
        secondaire: [quand(n.rappel_a as string, maintenant), n.demandes?.nom_client].filter(Boolean).join(" · "),
        href: fiche(n.demande_id, "/dashboard/notes"),
      })),
    ...evenementsDerriere
      .filter((e) => actif(e.demande_id))
      .map((e) => {
        const client = e.demandes?.nom_client ?? undefined;
        const rdv = e.type === "rendez_vous";
        return {
          cle: `evenement-${e.id}`,
          genre: rdv ? ("rdv" as const) : ("tache" as const),
          id: e.id,
          date: e.date_heure,
          principal: client ?? e.titre,
          secondaire: `${quand(e.date_heure, maintenant)} · ${client ? e.titre : rdv ? "Rendez-vous" : "Rappel"}`,
          href: fiche(e.demande_id, "/dashboard/planning"),
          demandeId: e.demande_id,
        };
      }),
    ...listeProjets
      .filter((p) => p.statut !== "termine" && !idsAvecEvenementFutur.has(p.id))
      .map((p) => ({ p, depuis: questionChantier(p.id) }))
      .filter((x): x is { p: Projet; depuis: number } => x.depuis !== null)
      .map(({ p, depuis }) => ({
        cle: `chantier-${p.id}`,
        genre: "chantier" as const,
        id: p.id,
        date: new Date(depuis).toISOString(),
        principal: p.nom_client,
        secondaire: "Chantier terminé ?",
        href: `/dashboard/demandes/${p.id}`,
        demandeId: p.id,
      })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  // ---- Devant : ce dont l'heure n'est pas passée -------------------------
  const duJour = duJourPlat.filter((e) => !idsDerriere.has(e.id) && actif(e.demande_id));
  const rdvDuJour = duJour.filter((e) => e.type === "rendez_vous");
  // Maintenant, règles 1 et 2 : le rendez-vous en cours, sinon le prochain.
  const rdvMaintenant =
    rdvDuJour.find((e) => Date.parse(e.date_heure) <= t && t < finEstimee(e)) ?? rdvDuJour.find((e) => Date.parse(e.date_heure) > t) ?? null;

  const ligneEvenement = (e: (typeof duJour)[number]): ElementJour => {
    const client = e.demandes?.nom_client ?? undefined;
    return {
      cle: `evenement-${e.id}`,
      genre: e.type === "rendez_vous" ? "rdv" : "tache",
      id: e.id,
      date: e.date_heure,
      principal: e.type === "rendez_vous" ? client ?? e.titre : e.titre,
      secondaire: e.type === "rendez_vous" ? (client ? e.titre : undefined) : client,
      href: fiche(e.demande_id, "/dashboard/planning"),
    };
  };
  // Un rendez-vous fini depuis moins d'une heure reste devant, en tête.
  const rdvFinis = rdvDuJour.filter((e) => e.id !== rdvMaintenant?.id && finEstimee(e) <= t).map(ligneEvenement);
  const aujourdhui: ElementJour[] = [
    ...rdvFinis,
    ...[
      ...duJour.filter((e) => e.id !== rdvMaintenant?.id && !(e.type === "rendez_vous" && finEstimee(e) <= t)).map(ligneEvenement),
      ...notesAvecRappel
        .filter((n) => {
          const r = Date.parse(n.rappel_a as string);
          return r >= t && r < finJourParis.getTime();
        })
        .map((n) => ({
          cle: `note-${n.id}`,
          genre: "note" as const,
          id: n.id,
          date: n.rappel_a as string,
          principal: n.titre,
          secondaire: n.demandes?.nom_client,
          href: fiche(n.demande_id, "/dashboard/notes"),
        })),
    ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
  ];

  // ---- À suivre : les dossiers qui attendent un geste --------------------
  const joursDepuis = (iso: string) => Math.max(0, Math.floor((t - Date.parse(iso)) / JOUR_MS));
  const argent = calculerArgent({ devis: devisListPlat, factures: facturesDues, projets: listeProjets, messages: relancesBrut ?? [], maintenant });
  const aSuivreTout: LigneASuivre[] = [
    ...listeProjets
      .filter((p) => p.statut === "nouveau" || p.statut === "analyse")
      .map((p) => {
        const nouveau = p.statut === "nouveau";
        return {
          cle: `projet-${p.id}`,
          id: p.id,
          jours: joursDepuis(p.created_at),
          principal: p.nom_client,
          secondaire: nouveau ? "Nouveau projet à cadrer" : "Devis à préparer",
          action: nouveau ? `Cadrer le projet ${p.nom_client}` : `Préparer le devis de ${p.nom_client}`,
          href: `/dashboard/demandes/${p.id}`,
        };
      }),
    // Relire et Envoyer ouvrent le devis lui-même.
    ...argent.devisAEnvoyer.map((d) => ({
      cle: `devis-${d.id}`,
      id: d.id,
      jours: d.jours,
      principal: d.nom,
      secondaire: d.quoi,
      action: `${d.quoi === "Devis à relire" ? "Relire" : "Envoyer"} le devis ${d.nom}`,
      href: d.href,
    })),
    // Relancer : dès le seuil (devis à 5 j, facture échue à 3 j), et pas
    // dans la semaine qui suit une relance préparée.
    ...argent.enAttente
      .filter((l) => l.relance && !l.relanceeRecemment)
      .map((l) => ({
        cle: `${l.genre}-${l.id}`,
        id: l.id,
        jours: l.jours,
        principal: l.nom,
        secondaire: l.quoi,
        action: `Relancer ${l.nom}`,
        href: l.href,
        relance: l.relance,
      })),
  ]
    // Le plus ancien d'abord.
    .sort((a, b) => b.jours - a.jours)
    .map(({ jours, ...l }) => ({ ...l, repere: `${jours} j` }));

  // ---- Maintenant ------------------------------------------------------------
  let action: ActionAccueil | null = null;
  if (rdvMaintenant) {
    const client = rdvMaintenant.demandes?.nom_client ?? undefined;
    const adresse = rdvMaintenant.demandes?.adresse_client ?? null;
    action = {
      id: rdvMaintenant.id,
      texte: `${heureCourte(rdvMaintenant.date_heure)} · ${client ?? rdvMaintenant.titre}`,
      detail: adresse ?? (client ? rdvMaintenant.titre : undefined),
      href: fiche(rdvMaintenant.demande_id, "/dashboard/planning"),
      adresse,
    };
  } else if (!estLeSoir && aSuivreTout.length > 0) {
    const l = aSuivreTout[0];
    action = { id: l.cle, texte: l.action, detail: `${l.secondaire} · ${l.repere}`, href: l.relance ?? l.href };
  }
  const aSuivre = aSuivreTout.filter((l) => l.cle !== action?.id);

  const rienDevantNiDerriere = !rdvMaintenant && aujourdhui.length === 0 && aRegler.length === 0;
  const premierProjet = listeProjets.length === 0;
  const r = aplatirClient(premierRdvDemainBrut)[0];
  const demain = r ? [heureCourte(r.date_heure), r.demandes?.nom_client ?? r.titre, r.demandes?.adresse_client].filter(Boolean).join(" · ") : null;

  const premierPrenom = (profil?.nom ?? "").split(" ")[0];
  const dateDuJour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

  return (
    <VueAccueil
      dateDuJour={dateDuJour}
      titre={premierProjet ? "Bienvenue sur Compyo." : `${estLeSoir ? "Bonsoir" : "Bonjour"} ${premierPrenom}`.trim()}
      premierProjet={premierProjet}
      maintenant={action}
      repos={estLeSoir && !premierProjet && rienDevantNiDerriere}
      rienDUrgent={!estLeSoir && !premierProjet && rienDevantNiDerriere && aSuivre.length === 0 && !action}
      demain={demain}
      aujourdhui={aujourdhui}
      aRegler={aRegler}
      aSuivre={aSuivre}
    />
  );
}
