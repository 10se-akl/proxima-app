import { createClient } from "@/lib/supabase/server";
import { VueAccueil, type ActionAccueil, type LigneASuivre } from "@/components/accueil/VueAccueil";
import type { ElementJour } from "@/components/accueil/ListeAujourdhui";
import type { ElementARegler } from "@/components/accueil/ARegler";
import type { ChantierAccueil } from "@/components/accueil/ChantiersAccueil";
import type { Projet } from "@/types";
import { etapeDe, lieuDe, prochainRendezVous, quoiDe } from "@/lib/projetAffichage";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation } from "@/lib/notes";
import { aujourdhuiParis, minuitParis, moisCourant, nomMois } from "@/lib/moisParis";
import { chiffresDuMoisEnCours } from "@/lib/activite";
import type { ChiffresDuMois } from "@/components/accueil/ChiffresMois";
import { aplatirClient, calculerArgent, JOURS_PAUSE_RELANCE } from "@/lib/argent";
import {
  JOURS_A_PLANIFIER,
  JOURS_AVANT_EXPIRATION,
  TYPES_SOMMEIL,
  etatsSommeil,
  etatsValables,
  joursAvantExpiration,
  raisonSommeil,
} from "@/lib/projetEnSommeil";

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
// Un message partagé et jamais rangé reste visible une semaine.
const JOURS_PARTAGE_VISIBLE = 7;

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

const CHANTIERS_VISIBLES = 5;
/** « Ça dort » : pas plus de trois questions à la fois sur l'accueil. */
const DORMANTS_MAX = 3;
const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Le même, en cinq signes au plus, pour la colonne du repère : « 14h30 »,
 *  « hier », « lun. », « 29/09 ». */
function quandBref(iso: string, maintenant: Date): string {
  const d = new Date(iso);
  const ecart = Math.round((Date.parse(CLE_JOUR.format(maintenant)) - Date.parse(CLE_JOUR.format(d))) / JOUR_MS);
  if (ecart <= 0) return heureCourte(iso);
  if (ecart === 1) return "hier";
  if (ecart < 7) return JOUR_SEMAINE.format(d);
  return CLE_JOUR.format(d).slice(5).split("-").reverse().join("/");
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

  // 22/10 (panel) — l'argent du mois en haut de l'accueil : signé et
  // encaissé ce mois-ci, avec les règles du Bilan (lib/activite.ts,
  // chiffresDuMoisEnCours : trois petites requêtes sur le seul mois en
  // cours), lancées en même temps que le reste. « À encaisser » vient de
  // calculerArgent plus bas (le même total que la page Factures et le
  // Bilan). Une lecture en échec n'affiche rien plutôt qu'un « 0 € » faux.
  const moisEnCours = moisCourant(maintenant);
  const chiffresMoisPromesse: Promise<{ signe: number; encaisse: number } | null> = organisationId
    ? chiffresDuMoisEnCours(supabase, organisationId, maintenant).catch((erreur) => {
        console.error("Accueil : chiffres du mois indisponibles", erreur);
        return null;
      })
    : Promise.resolve(null);

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
    { data: partagesBrut },
    { data: sommeilBrut },
  ] = await Promise.all([
    supabase.from("profils").select("nom").eq("id", user?.id).single(),
    supabase.from("demandes").select("*").eq("organisation_id", organisationId),
    supabase
      .from("devis")
      .select("id, statut, numero, envoye_le, created_at, total_estime, demande_id, artisan_id, signe_le, validite_jours, demandes(nom_client)")
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
    // Refonte visuelle (04/10) : la date et le type en plus, pour le
    // prochain rendez-vous de chaque projet dans « Mes projets ».
    supabase
      .from("evenements_planning")
      .select("demande_id, date_heure, type")
      .eq("organisation_id", organisationId)
      .neq("statut", "annule")
      .gte("date_heure", maintenant.toISOString())
      .order("date_heure", { ascending: true }),
    // Journal chantier vocal (06/09) — second signal de clôture, et les
    // « Pas encore » (duel C, lot 3).
    supabase
      .from("evenements_projet")
      .select("demande_id, metadata, type, created_at")
      .eq("organisation_id", organisationId)
      .in("type", ["journal_chantier_interprete", "chantier_pas_termine"])
      .order("created_at", { ascending: false }),
    // 23/10 — toutes les factures (plus seulement les émises) : « Facturer
    // le solde » déduit aussi les payées et les avoirs, comme la page Argent.
    // calculerArgent ne garde que les émises pour ce qui reste à encaisser.
    supabase
      .from("factures")
      .select("id, numero, demande_id, statut, type, total_ttc, date_emission, date_echeance, artisan_id, demandes(nom_client)")
      .eq("organisation_id", organisationId),
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
      .select("date_heure, titre, demandes(nom_client, adresse_client, notes)")
      .eq("organisation_id", organisationId)
      .eq("type", "rendez_vous")
      .eq("statut", "a_faire")
      .gte("date_heure", finJourParis.toISOString())
      .lt("date_heure", finDemainParis.toISOString())
      .order("date_heure", { ascending: true })
      .limit(1),
    // Refonte (03/10 — duel E, lot 2) : les messages partagés depuis
    // WhatsApp ou les SMS et jamais rangés. Créer un projet ou ajouter le
    // message à un projet supprime la ligne (api/demandes/
    // creer-depuis-brouillon et ajouter-note-depuis-partage) : ce qui reste
    // a été abandonné en route (un appel, une coupure). Seul le compte qui
    // a capté les voit (RLS inchangée) ; au-delà de 7 jours, ils sont
    // masqués, pas supprimés.
    user
      ? supabase
          .from("partages_entrants")
          .select("id, texte, images, created_at")
          .eq("artisan_id", user.id)
          .gte("created_at", new Date(t - JOURS_PARTAGE_VISIBLE * JOUR_MS).toISOString())
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    // 23/10 — les traces « Dans 1 sem. », « Ranger », « Reprendre »
    // (lib/projetEnSommeil.ts), à part : la requête du journal de chantier
    // peut devenir longue, une trace de sommeil ne doit jamais en tomber.
    supabase
      .from("evenements_projet")
      .select("demande_id, type, created_at")
      .eq("organisation_id", organisationId)
      .in("type", [...TYPES_SOMMEIL])
      .order("created_at", { ascending: false }),
  ]);

  const devisListPlat = aplatirClient(devisList);
  const duJourPlat = aplatirClient(evenementsAujourdhui);
  const passesPlat = aplatirClient(passesBrut);
  const toutesFactures = aplatirClient(facturesDuesBrut);
  const facturesDues = toutesFactures.filter((f) => f.statut === "emise" && f.type !== "avoir");

  const listeProjets = (projets as Projet[] | null) ?? [];
  // Un chantier marqué « terminé » disparaît de toute section de l'accueil
  // (ses factures impayées restent dans Argent).
  const idsProjetsTermines = new Set(listeProjets.filter((p) => p.statut === "termine").map((p) => p.id));
  const actif = (demandeId: string | null) => !demandeId || !idsProjetsTermines.has(demandeId);
  // 23/10 — les projets mis de côté une semaine ou classés (lib/projetEnSommeil.ts) :
  // l'accueil ne les propose plus (À suivre, « ça dort »), et un projet
  // classé quitte « Mes projets ». Leurs factures et leurs rappels restent.
  // Un projet qui a bougé depuis le geste (signé, devis créé ou envoyé,
  // fiche modifiée) se réveille de lui-même (sommeilValable).
  const sommeil = etatsValables(etatsSommeil(sommeilBrut ?? [], maintenant), listeProjets, devisListPlat);
  const devisParProjet = new Map<string, (typeof devisListPlat)[number][]>();
  for (const d of devisListPlat) if (d.demande_id) devisParProjet.set(d.demande_id, [...(devisParProjet.get(d.demande_id) ?? []), d]);
  const endormi = (demandeId: string | null | undefined) => !!demandeId && sommeil.has(demandeId);
  const classe = (demandeId: string) => sommeil.get(demandeId)?.etat === "classe";
  // Le dernier devis envoyé de chaque projet (relances, expiration, sommeil).
  const dernierDevisEnvoye = new Map<string, (typeof devisListPlat)[number]>();
  for (const d of devisListPlat) {
    if (d.statut !== "envoye" || !d.envoye_le || !d.demande_id) continue;
    const deja = dernierDevisEnvoye.get(d.demande_id);
    if (!deja || (deja.envoye_le ?? "") < d.envoye_le) dernierDevisEnvoye.set(d.demande_id, d);
  }
  const fiche = (demandeId: string | null, repli: string) => (demandeId ? `/dashboard/demandes/${demandeId}` : repli);
  const finEstimee = (e: { type: string; date_heure: string; duree_minutes?: number | null }) =>
    Date.parse(e.date_heure) + (e.duree_minutes ?? (e.type === "rendez_vous" ? 60 : 15)) * 60000;

  // ---- L'auteur (refonte 03/10 — duel C, lot 5) ----------------------------
  // Un seul espace partagé (duel A) : dans « À régler » et « À suivre »,
  // « · Lucas » quand la ligne vient d'un coéquipier. Les profils des
  // membres se lisent entre eux (schema.sql, « un membre lit les profils de
  // son organisation ») ; un ancien membre n'est plus lisible et n'affiche
  // rien. Seul un compte d'équipe paie cette requête : un artisan seul n'a
  // aucun autre auteur.
  const autres = new Set<string>();
  for (const x of [...notesAvecRappel, ...passesPlat, ...listeProjets, ...devisListPlat, ...facturesDues] as { artisan_id?: string | null }[]) {
    if (x.artisan_id && x.artisan_id !== user?.id) autres.add(x.artisan_id);
  }
  const { data: auteurs } =
    autres.size > 0
      ? await supabase.from("profils").select("id, nom").in("id", Array.from(autres))
      : { data: [] as { id: string; nom: string | null }[] };
  const prenoms = new Map((auteurs ?? []).map((a) => [a.id as string, ((a.nom as string | null) ?? "").trim().split(/\s+/)[0]]));
  /** Le détail d'une ligne, suivi du prénom de son auteur si ce n'est pas vous. */
  const parAuteur = (detail: string | undefined, artisanId?: string | null): string | undefined => {
    const prenom = artisanId && artisanId !== user?.id ? prenoms.get(artisanId) : undefined;
    return prenom ? [detail, prenom].filter(Boolean).join(" · ") : detail;
  };

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

  // Pas de « ça dort » sur un projet qui a déjà sa question « Chantier
  // terminé ? », un rendez-vous à venir ou un devis en préparation.
  const dormants = listeProjets
    .filter((p) => p.statut !== "termine" && !endormi(p.id) && questionChantier(p.id) === null)
    .map((p) => ({ p, raison: raisonSommeil(p, devisParProjet.get(p.id) ?? [], idsAvecEvenementFutur.has(p.id), maintenant) }))
    .filter((x): x is { p: Projet; raison: { jours: number; texte: string } } => x.raison !== null)
    .sort((a, b) => b.raison.jours - a.raison.jours);
  const idsDormants = new Set(dormants.slice(0, DORMANTS_MAX).map((x) => x.p.id));

  const aRegler: ElementARegler[] = [
    ...notesAvecRappel
      .filter((n) => Date.parse(n.rappel_a as string) < t)
      .map((n) => ({
        cle: `note-${n.id}`,
        genre: "note" as const,
        id: n.id,
        date: n.rappel_a as string,
        principal: n.titre,
        secondaire: parAuteur([quand(n.rappel_a as string, maintenant), n.demandes?.nom_client].filter(Boolean).join(" · "), n.artisan_id),
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
          secondaire: parAuteur(`${quand(e.date_heure, maintenant)} · ${client ? e.titre : rdv ? "Rendez-vous" : "Rappel"}`, e.artisan_id),
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
        secondaire: parAuteur("Chantier terminé ?", p.artisan_id),
        href: `/dashboard/demandes/${p.id}`,
        demandeId: p.id,
      })),
    // 23/10 — « ça dort » : trois au plus à la fois, les plus anciens.
    ...dormants.slice(0, DORMANTS_MAX).map(({ p, raison }) => ({
      cle: `dort-${p.id}`,
      genre: "dormant" as const,
      id: p.id,
      date: new Date(t - raison.jours * JOUR_MS).toISOString(),
      principal: p.nom_client,
      secondaire: parAuteur(raison.texte, p.artisan_id),
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
  /** « Devis valable encore 3 j » quand il expire dans 5 jours ou moins,
   *  en jours de Paris comme sur le document (finDeValidite). Un devis sans
   *  durée de validité n'expire pas. */
  const expiration = (devisId: string): string | null => {
    const d = devisListPlat.find((x) => x.id === devisId);
    if (!d?.envoye_le) return null;
    const reste = joursAvantExpiration(d, maintenant);
    if (reste === null || reste < 0 || reste > JOURS_AVANT_EXPIRATION) return null;
    return reste === 0 ? "Devis valable jusqu'à ce soir" : `Devis valable encore ${reste} j`;
  };
  // Une v2 laisse la v1 « envoyée » : une seule relance par projet, la
  // dernière version (relecture du 23/10).
  const derniereVersion = (l: { genre: string; id: string; demandeId: string | null }) =>
    l.genre !== "devis" || !l.demandeId || dernierDevisEnvoye.get(l.demandeId)?.id === l.id;
  const argent = calculerArgent({
    devis: devisListPlat,
    factures: toutesFactures,
    projets: listeProjets,
    messages: relancesBrut ?? [],
    avecAFacturer: true,
    maintenant,
  });
  // Une ligne d'un projet qui dort, mis de côté ou classé ne s'affiche pas
  // ici : il a sa question dans « À confirmer », ou il se tait.
  const propose = (demandeId: string | null | undefined) => !endormi(demandeId) && !(demandeId && idsDormants.has(demandeId));
  const nomProjet = new Map(listeProjets.map((p) => [p.id, p.nom_client]));
  const aSuivreTout: LigneASuivre[] = [
    ...listeProjets
      .filter((p) => (p.statut === "nouveau" || p.statut === "analyse") && propose(p.id))
      .map((p) => {
        const nouveau = p.statut === "nouveau";
        return {
          cle: `projet-${p.id}`,
          id: p.id,
          jours: joursDepuis(p.created_at),
          principal: p.nom_client,
          secondaire: parAuteur(nouveau ? "Nouveau projet à cadrer" : "Devis à préparer", p.artisan_id) as string,
          action: nouveau ? `Cadrer le projet ${p.nom_client}` : `Préparer le devis de ${p.nom_client}`,
          href: `/dashboard/demandes/${p.id}`,
          bouton: nouveau ? null : { libelle: "Préparer", href: `/dashboard/demandes/${p.id}` },
        };
      }),
    // Relire et Envoyer ouvrent le devis lui-même.
    ...argent.devisAEnvoyer.filter((d) => propose(d.demandeId)).map((d) => ({
      cle: `devis-${d.id}`,
      id: d.id,
      jours: d.jours,
      principal: d.nom,
      secondaire: parAuteur(d.quoi, d.artisanId) as string,
      action: `${d.quoi === "Devis à relire" ? "Relire" : "Envoyer"} le devis ${d.nom}`,
      href: d.href,
      bouton: { libelle: d.quoi === "Devis à relire" ? "Relire" : "Envoyer", href: d.href },
    })),
    // Relancer : dès le seuil (devis à 5 j, facture échue à 3 j), et pas
    // dans la semaine qui suit une relance préparée.
    ...argent.enAttente
      .filter((l) => l.relance && !l.relanceeRecemment && derniereVersion(l) && (l.genre === "facture" || propose(l.demandeId)))
      .map((l) => ({
        cle: `${l.genre}-${l.id}`,
        id: l.id,
        jours: l.jours,
        principal: l.nom,
        secondaire: parAuteur(l.genre === "devis" ? expiration(l.id) ?? l.quoi : l.quoi, l.artisanId) as string,
        action: `Relancer ${l.nom}`,
        href: l.href,
        relance: l.relance,
      })),
    // 23/10 — un devis qui expire bientôt, même relancé il y a peu : la date
    // limite est un bon motif d'appel (« votre devis est valable jusqu'à… »).
    ...Array.from(dernierDevisEnvoye.values())
      .filter((d) => d.demande_id && propose(d.demande_id) && expiration(d.id) !== null)
      .filter((d) => !argent.enAttente.some((l) => l.genre === "devis" && l.id === d.id && l.relance && !l.relanceeRecemment))
      .filter((d) => listeProjets.some((p) => p.id === d.demande_id && p.statut === "devis_envoye"))
      .map((d) => {
        const nom = d.demandes?.nom_client || nomProjet.get(d.demande_id as string) || `Devis ${d.numero}`;
        return {
          cle: `expire-${d.id}`,
          id: d.id,
          jours: joursDepuis(d.envoye_le as string),
          principal: nom,
          secondaire: parAuteur(expiration(d.id) as string, d.artisan_id) as string,
          action: `Relancer ${nom}`,
          href: `/dashboard/demandes/${d.demande_id}`,
          relance: `/dashboard/demandes/${d.demande_id}?message=relanceDevis&devis=${d.id}`,
        };
      }),
    // 23/10 — chantier fini, pas tout facturé : le même calcul que la page
    // Argent (calculerAFacturer). L'argent oublié.
    ...argent.aFacturer
      .filter((l) => !classe(l.demandeId))
      .map((l) => ({
        cle: `facturer-${l.demandeId}`,
        id: l.demandeId,
        jours: l.jours,
        principal: l.nom,
        secondaire: parAuteur(`Chantier fini · ${euros(l.solde)} TTC à facturer`, l.artisanId) as string,
        action: `Facturer le solde de ${l.nom}`,
        href: `${l.href}#facturation`,
        bouton: { libelle: "Facturer", href: `${l.href}#facturation` },
      })),
    // 23/10 — signé, mais aucune date de chantier : « Planifier ».
    ...listeProjets
      .filter(
        (p) =>
          p.statut === "accepte" &&
          propose(p.id) &&
          questionChantier(p.id) === null &&
          !idsAvecEvenementFutur.has(p.id) &&
          !!p.accepte_le &&
          joursDepuis(p.accepte_le) >= JOURS_A_PLANIFIER
      )
      .map((p) => ({
        cle: `planifier-${p.id}`,
        id: p.id,
        jours: joursDepuis(p.accepte_le as string),
        principal: p.nom_client,
        secondaire: parAuteur("Accepté · chantier à planifier", p.artisan_id) as string,
        action: `Planifier le chantier de ${p.nom_client}`,
        href: `/dashboard/demandes/${p.id}`,
        bouton: { libelle: "Planifier", href: `/dashboard/planning/nouveau?projetId=${p.id}` },
      })),
  ]
    // Le plus ancien d'abord.
    .sort((a, b) => b.jours - a.jours)
    .map(({ jours, ...l }) => ({ ...l, repere: `${jours} j` }));
  // Les messages reçus et pas rangés passent en tête : ils restent parmi
  // les cinq lignes visibles, et la page de partage relance la recherche
  // du client et l'IA.
  const recus: LigneASuivre[] = (partagesBrut ?? []).map((p) => {
    const apercu = (p.texte ?? "").split("\n").map((s: string) => s.trim()).find(Boolean);
    return {
      cle: `recu-${p.id}`,
      id: p.id,
      repere: quandBref(p.created_at, maintenant),
      principal: apercu ?? (Array.isArray(p.images) && p.images.length > 0 ? "Photo partagée" : "Message partagé"),
      secondaire: "Reçu · à ranger",
      action: "Ranger le message reçu",
      href: `/dashboard/demandes/partage/${p.id}`,
    };
  });
  aSuivreTout.unshift(...recus);

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
  // 23/10 — le soir, avec le premier rendez-vous de demain, son « À retenir »
  // (code du portail, chien, mesures : demandes.notes), sur une ligne.
  // Seul le mémo : les messages partagés ajoutés plus bas (« --- Message
  // partagé --- ») n'en font pas partie. Coupé par caractères entiers.
  const memoDemain = ((r?.demandes as { notes?: string | null } | null)?.notes ?? "").split(/\n\s*---/)[0].replace(/\s+/g, " ").trim();
  const lettres = Array.from(memoDemain);
  const demainRetenir = lettres.length === 0 ? null : lettres.length > 90 ? `${lettres.slice(0, 89).join("")}…` : memoDemain;

  // ---- Les compteurs et « Mes projets » (refonte visuelle 04/10) ---------
  const compteurs = {
    rdv: duJourPlat.filter((e) => e.type === "rendez_vous" && actif(e.demande_id)).length,
    devis: argent.enAttente.filter((l) => l.genre === "devis").length,
    factures: argent.aEncaisser.nombre,
    facturesEnRetard: argent.aEncaisser.enRetard,
    aRegler: aRegler.length,
  };

  const prochainRdv = new Map<string, string>();
  for (const e of evenementsFutursBrut ?? []) {
    if (e.type === "rendez_vous" && e.demande_id && !prochainRdv.has(e.demande_id)) prochainRdv.set(e.demande_id, e.date_heure);
  }
  const enCours = listeProjets
    .filter((p) => p.statut !== "termine" && !classe(p.id))
    .sort((a, b) => Date.parse(b.derniere_modification_le ?? b.created_at) - Date.parse(a.derniere_modification_le ?? a.created_at));
  const visibles = enCours.slice(0, CHANTIERS_VISIBLES);
  // La première photo de chaque projet : un seul appel groupé pour les URLs
  // signées (le stockage est privé). Un échec n'enlève que les photos.
  const urlsPhotos = new Map<string, string>();
  const chemins = visibles.map((p) => p.photos?.[0]).filter((c): c is string => typeof c === "string" && c.length > 0);
  if (chemins.length > 0) {
    try {
      const { data } = await supabase.storage.from("photos").createSignedUrls(chemins, 3600);
      for (const item of data ?? []) if (item.signedUrl && !item.error && item.path) urlsPhotos.set(item.path, item.signedUrl);
    } catch (erreur) {
      console.error("Accueil : miniatures indisponibles", erreur);
    }
  }
  const chantiers: ChantierAccueil[] = visibles.map((p) => {
    const rdv = prochainRdv.get(p.id);
    const photo = p.photos?.[0];
    return {
      id: p.id,
      nom: p.nom_client,
      quoi: quoiDe(p),
      lieu: lieuDe(p.adresse_client),
      etape: etapeDe(p.statut).libelle,
      couleur: etapeDe(p.statut).couleur,
      info: rdv ? prochainRendezVous(rdv, maintenant) : null,
      telephone: p.telephone_client,
      adresse: p.adresse_client,
      photo: photo ? urlsPhotos.get(photo) ?? null : null,
      urgent: p.priorite === "urgent",
    };
  });

  const duMois = await chiffresMoisPromesse;
  const chiffresMois: ChiffresDuMois | null = duMois
    ? { nomMois: nomMois(moisEnCours), signe: duMois.signe, encaisse: duMois.encaisse, aEncaisser: argent.aEncaisser }
    : null;
  const premierPrenom = (profil?.nom ?? "").split(" ")[0];
  // 23/10 — la phrase du soir (panel : « le soir, je veux que l'appli me
  // dise : c'est bon, t'as 6 000 € qui arrivent »). Rien d'estimé : ce qui
  // reste à voir sur l'écran, et ce qu'on vous doit (le même total que la
  // bande et la page Factures).
  // 2e panel : dire QUOI (et pas répéter les montants de la bande juste
  // dessous) ; les mêmes lignes que l'écran (À suivre en entier, À confirmer).
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const nbFacturer = aSuivreTout.filter((l) => l.cle.startsWith("facturer-")).length;
  const nbRelances = aSuivreTout.filter((l) => l.relance).length;
  const nbAutres = aSuivreTout.length - nbFacturer - nbRelances;
  const morceaux = [
    nbFacturer > 0 ? pluriel(nbFacturer, "chantier à facturer", "chantiers à facturer") : null,
    nbRelances > 0 ? pluriel(nbRelances, "relance", "relances") : null,
    aRegler.length > 0 ? pluriel(aRegler.length, "chose à confirmer", "choses à confirmer") : null,
    aujourdhui.length > 0 ? pluriel(aujourdhui.length, "chose encore prévue", "choses encore prévues") : null,
    nbAutres > 0 ? pluriel(nbAutres, "dossier à faire avancer", "dossiers à faire avancer") : null,
  ].filter((m): m is string => m !== null);
  const phraseDuSoir = morceaux.length === 0 ? "Tout est à jour. Bonne soirée." : `Ce soir : ${morceaux.join(", ")}.`;
  const dateDuJour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

  return (
    <VueAccueil
      dateDuJour={dateDuJour}
      titre={premierProjet ? "Bienvenue sur Compyo." : `${estLeSoir ? "Bonsoir" : "Bonjour"} ${premierPrenom}`.trim()}
      sousTitre={
        premierProjet
          ? "Votre premier projet commence ici."
          : // Le repos (« Tout est réglé. ») le dit déjà : pas de phrase qui le contredise.
            estLeSoir && !(rienDevantNiDerriere && !premierProjet)
            ? phraseDuSoir
            : undefined
      }
      premierProjet={premierProjet}
      maintenant={action}
      repos={estLeSoir && !premierProjet && rienDevantNiDerriere}
      soir={estLeSoir && !premierProjet}
      demainRetenir={demainRetenir}
      rienDUrgent={!estLeSoir && !premierProjet && rienDevantNiDerriere && aSuivre.length === 0 && !action}
      demain={demain}
      aujourdhui={aujourdhui}
      aRegler={aRegler}
      aSuivre={aSuivre}
      compteurs={compteurs}
      chiffresMois={premierProjet ? null : chiffresMois}
      chantiers={chantiers}
      nbChantiers={enCours.length}
    />
  );
}
