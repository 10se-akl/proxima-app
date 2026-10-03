import { createClient } from "@/lib/supabase/server";
import type { ElementJour } from "@/components/accueil/ListeAujourdhui";
import { VueAccueil, type ActionAccueil } from "@/components/accueil/VueAccueil";
import type { Projet } from "@/types";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation } from "@/lib/notes";
import { aujourdhuiParis, minuitParis } from "@/lib/moisParis";
import type { ElementSuspens, Fermeture } from "@/components/accueil/FermerJournee";
import { calculerArgent, type LigneEnAttente } from "@/lib/argent";

// ============================================================
// L'accueil (26/09 — « moins mais mieux », lot B).
//
// Une seule question : qu'est-ce que je dois faire ? Un jour chargé
// empilait jusqu'à douze blocs sur téléphone (quatorze sur ordinateur),
// dont trois conseillers. Maintenant, cinq blocs au plus, chacun affiché
// seulement s'il a quelque chose à dire :
//   1. Maintenant           — la prochaine action, une seule ;
//   2. À confirmer          — des questions oui / non ;
//   3. Aujourd'hui          — une liste triée par heure (rendez-vous,
//                             notes, rappels ; le retard en tête) ;
//   4. À faire de votre côté — ce que l'artisan doit produire ;
//   5. En attente du client — devis sans réponse, factures impayées.
// Sortis : la mini-démonstration et le panneau de conseils (l'artisan
// utilise déjà l'application), les devis refusés (aucune action à faire,
// ils restent dans la liste des devis), les paragraphes d'explication.
// Principe : une information n'apparaît que si elle risque d'être oubliée.
//
// Le soir (lot E) : à partir de HEURE_FERMETURE_JOURNEE, heure de Paris,
// « Maintenant » devient « Fermer la journée » (components/accueil/
// FermerJournee.tsx). Ce qui est en suspens y est traité, et n'est plus
// répété dans « Aujourd'hui » ni dans « À confirmer ».
// ============================================================

const HEURE_FERMETURE_JOURNEE = 17;

// Refonte (03/10 — duel B, lot 2) : les lignes d'argent (devis sans
// réponse, factures impayées, devis à relire ou à envoyer) et leurs seuils
// viennent de lib/argent.ts, la même fonction que la page Argent.

// Sans ça, Next.js peut servir une version mise en cache de cette page en
// revenant dessus après avoir changé d'onglet ou de page (cache de routeur
// côté navigateur, ~30 secondes par défaut) — ce qui donnait l'impression
// qu'une confirmation déjà traitée (rendez-vous, chantier terminé...)
// n'avait jamais été enregistrée. Cette page dépend d'un état qui change à
// chaque clic : elle doit toujours être recalculée, jamais servie en cache.
export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  const maintenant = new Date();

  // Le jour à Paris. Refonte (02/10) — le serveur tourne en UTC : les
  // bornes « aujourd'hui » des rendez-vous et des notes étaient calculées
  // à minuit UTC (2 h du matin à Paris l'été), si bien qu'un rendez-vous
  // tôt le matin ou un rappel juste après minuit tombait du mauvais côté.
  // Une seule définition du jour pour tout l'accueil, celle de Paris.
  const jourParis = aujourdhuiParis(maintenant);
  const debutJourParis = minuitParis(jourParis.annee, jourParis.mois, jourParis.jour);
  const finJourParis = minuitParis(jourParis.annee, jourParis.mois, jourParis.jour + 1);
  const finDemainParis = minuitParis(jourParis.annee, jourParis.mois, jourParis.jour + 2);
  const heureParis = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).format(maintenant)
  );
  const estLeSoir = heureParis >= HEURE_FERMETURE_JOURNEE;

  // Requêtes indépendantes (aucune ne dépend du résultat d'une autre,
  // seulement de l'utilisateur déjà connu) : en parallèle, ce qui compte
  // vraiment sur un chantier avec un réseau mobile faible.
  const [
    { data: profil },
    { data: projets },
    { data: devisList },
    { data: evenementsAujourdhui },
    { data: aConfirmerBrut },
    { data: rdvConfirmesBrut },
    { data: evenementsFutursBrut },
    { data: journalEvenementsBrut },
    { data: facturesDuesBrut },
    notesAvecRappel,
    { count: nbFacturesDuJour },
    { data: premierRdvDemainBrut },
  ] = await Promise.all([
    supabase.from("profils").select("nom").eq("id", user?.id).single(),
    supabase.from("demandes").select("*").eq("organisation_id", organisationId),
    supabase
      .from("devis")
      .select("id, statut, numero, envoye_le, created_at, total_estime, demande_id, demandes(nom_client)")
      .eq("organisation_id", organisationId),
    supabase
      .from("evenements_planning")
      .select("id, type, statut, titre, demande_id, date_heure, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .gte("date_heure", debutJourParis.toISOString())
      .lt("date_heure", finJourParis.toISOString())
      .neq("statut", "annule")
      .order("date_heure", { ascending: true }),
    // Événements passés jamais confirmés (ni "fait", ni "annulé") : on ne
    // suppose rien, on demande — voir composant AConfirmer. On calcule
    // ensuite l'heure de fin estimée de chaque événement (durée
    // renseignée, ou 60 min pour un rendez-vous / 15 min pour une tâche
    // par défaut) et on ne garde que ceux déjà terminés.
    supabase
      .from("evenements_planning")
      .select("id, type, titre, demande_id, date_heure, duree_minutes, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .eq("statut", "a_faire")
      .lt("date_heure", maintenant.toISOString())
      .order("date_heure", { ascending: false }),
    // Rendez-vous déjà confirmés "fait" (voir ConfirmerClotureProjet) : filet
    // de sécurité pour la question "le chantier est-il terminé ?".
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
    // Journal chantier vocal (06/09) — second signal de clôture en plus du
    // rendez-vous confirmé "fait", voir components/dashboard/NotesVocales.tsx.
    supabase
      .from("evenements_projet")
      .select("demande_id, metadata, type, created_at")
      .eq("organisation_id", organisationId)
      .in("type", ["journal_chantier_interprete", "chantier_pas_termine"])
      .order("created_at", { ascending: false }),
    // 26/09 — les factures encore dues, pour « En attente du client ».
    supabase
      .from("factures")
      .select("id, numero, demande_id, statut, type, total_ttc, date_emission, date_echeance, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .eq("statut", "emise")
      .neq("type", "avoir"),
    organisationId
      ? listerNotesActivesOrganisation(supabase, organisationId, { avecRappelUniquement: true })
      : Promise.resolve([]),
    // Le soir seulement : les factures émises aujourd'hui, et le premier
    // rendez-vous de demain.
    estLeSoir
      ? supabase
          .from("factures")
          .select("id", { count: "exact", head: true })
          .eq("organisation_id", organisationId)
          .neq("type", "avoir")
          .gte("date_emission", debutJourParis.toISOString())
      : Promise.resolve({ count: 0 }),
    estLeSoir
      ? supabase
          .from("evenements_planning")
          .select("date_heure, titre, demandes(nom_client, adresse_client)")
          .eq("organisation_id", organisationId)
          .eq("type", "rendez_vous")
          .eq("statut", "a_faire")
          .gte("date_heure", finJourParis.toISOString())
          .lt("date_heure", finDemainParis.toISOString())
          .order("date_heure", { ascending: true })
          .limit(1)
      : Promise.resolve({ data: null }),
  ]);

  // Supabase type "demandes(...)" comme un tableau au niveau TypeScript
  // (relation jointe), même si demande_id ne pointe jamais vers plus d'un
  // projet. On aplatit une bonne fois ici.
  function aplatirDemandes<T extends { demandes?: unknown }>(
    lignes: T[] | null
  ): (Omit<T, "demandes"> & { demandes?: { nom_client?: string; statut?: string } | null })[] {
    return (lignes ?? []).map((l) => ({
      ...l,
      demandes: Array.isArray(l.demandes) ? l.demandes[0] ?? null : (l.demandes as any),
    }));
  }

  const devisListPlat = aplatirDemandes(devisList);
  const evenementsAujourdhuiPlat = aplatirDemandes(evenementsAujourdhui);
  const aConfirmerBrutPlat = aplatirDemandes(aConfirmerBrut);
  const facturesDues = aplatirDemandes(facturesDuesBrut);

  // Marge de tolérance : un chantier déborde souvent sur l'horaire prévu.
  // On attend une heure de plus après la fin estimée avant de demander.
  const MARGE_CONFIRMATION_MIN = 60;
  const aConfirmer = aConfirmerBrutPlat.filter((e) => {
    const dureeParDefaut = e.type === "rendez_vous" ? 60 : 15;
    const finEstimee =
      new Date(e.date_heure).getTime() +
      (e.duree_minutes ?? dureeParDefaut) * 60000 +
      MARGE_CONFIRMATION_MIN * 60000;
    return finEstimee < maintenant.getTime();
  });

  const listeProjets = (projets as Projet[] | null) ?? [];
  // Un chantier marqué "terminé" disparaît de TOUTE section de l'accueil.
  const idsProjetsTermines = new Set(listeProjets.filter((p) => p.statut === "termine").map((p) => p.id));
  const aConfirmerActifs = aConfirmer.filter((e) => !e.demande_id || !idsProjetsTermines.has(e.demande_id));

  // Filet de sécurité pour "le chantier est-il aussi terminé ?" (voir
  // ConfirmerClotureProjet) : tout projet actif dont au moins un
  // rendez-vous a été confirmé fait, et pour lequel plus rien n'est prévu.
  //
  // Refonte (02/10, duel C lot 3) — la question n'était pas honnête :
  //   - un simple métré confirmé « fait » la déclenchait, avant même un
  //     devis : seul un rendez-vous fait APRÈS l'envoi d'un devis compte ;
  //   - « Non » ne laissait aucune trace (seulement un « Plus tard » gardé
  //     dans le navigateur, avec une clé en UTC) : la question revenait le
  //     lendemain. « Pas encore » écrit maintenant un événement, et elle ne
  //     revient qu'après un nouveau rendez-vous fait.
  const premierEnvoiDevis = new Map<string, number>();
  for (const d of devisListPlat) {
    if (!d.demande_id || !d.envoye_le) continue;
    const t = Date.parse(d.envoye_le);
    const actuel = premierEnvoiDevis.get(d.demande_id);
    if (actuel === undefined || t < actuel) premierEnvoiDevis.set(d.demande_id, t);
  }
  const dernierRdvFait = new Map<string, number>();
  for (const e of rdvConfirmesBrut ?? []) {
    if (!e.demande_id) continue;
    const t = Date.parse(e.date_heure);
    const envoi = premierEnvoiDevis.get(e.demande_id);
    if (envoi === undefined || t < envoi) continue;
    if (t > (dernierRdvFait.get(e.demande_id) ?? 0)) dernierRdvFait.set(e.demande_id, t);
  }
  const dernierPasEncore = new Map<string, number>();
  for (const e of journalEvenementsBrut ?? []) {
    if (e.type !== "chantier_pas_termine" || !e.demande_id || dernierPasEncore.has(e.demande_id)) continue;
    dernierPasEncore.set(e.demande_id, Date.parse(e.created_at)); // trié du plus récent au plus ancien
  }
  const idsAvecRdvConfirme = new Set(
    Array.from(dernierRdvFait.entries())
      .filter(([id, t]) => t > (dernierPasEncore.get(id) ?? 0))
      .map(([id]) => id)
  );
  const idsAvecEvenementFutur = new Set((evenementsFutursBrut ?? []).map((e) => e.demande_id).filter(Boolean));

  // Journal chantier vocal (06/09) — au moins deux comptes-rendus vocaux
  // consécutifs signalant "chantier_semble_termine".
  const SEUIL_SIGNAUX_CLOTURE = 2;
  const signauxParProjet = new Map<string, boolean[]>();
  for (const e of journalEvenementsBrut ?? []) {
    if (!e.demande_id || e.type !== "journal_chantier_interprete") continue;
    const liste = signauxParProjet.get(e.demande_id) ?? [];
    liste.push(Boolean((e.metadata as { chantier_semble_termine?: boolean } | null)?.chantier_semble_termine));
    signauxParProjet.set(e.demande_id, liste);
  }
  const idsAvecSignalCloture = new Set(
    Array.from(signauxParProjet.entries())
      .filter(([, signaux]) => signaux.length >= SEUIL_SIGNAUX_CLOTURE && signaux.slice(0, SEUIL_SIGNAUX_CLOTURE).every(Boolean))
      // Un « Pas encore » plus récent que le dernier compte-rendu vocal l'emporte.
      .filter(([id]) => {
        const dernierJournal = (journalEvenementsBrut ?? []).find(
          (e) => e.demande_id === id && e.type === "journal_chantier_interprete"
        );
        return !dernierJournal || Date.parse(dernierJournal.created_at) > (dernierPasEncore.get(id) ?? 0);
      })
      .map(([id]) => id)
  );

  const projetsAConfirmerTermine = listeProjets
    .filter(
      (p) =>
        p.statut !== "termine" &&
        (idsAvecRdvConfirme.has(p.id) || idsAvecSignalCloture.has(p.id)) &&
        !idsAvecEvenementFutur.has(p.id)
    )
    .map((p) => ({ id: p.id, nom_client: p.nom_client }));

  // Un rendez-vous confirmé "fait" n'a plus rien à faire dans la journée.
  // Refonte (02/10) — celui qui attend sa confirmation non plus : il était
  // affiché deux fois, dans « Aujourd'hui » et dans « À confirmer ».
  const idsAConfirmer = new Set(aConfirmer.map((e) => e.id));
  const rendezVousDuJour =
    evenementsAujourdhuiPlat?.filter(
      (e) =>
        e.type === "rendez_vous" &&
        e.statut !== "termine" &&
        !idsAConfirmer.has(e.id) &&
        (!e.demande_id || !idsProjetsTermines.has(e.demande_id))
    ) ?? [];
  const rappelsDuJour =
    evenementsAujourdhuiPlat?.filter(
      (e) => e.type === "tache" && e.statut === "a_faire" && (!e.demande_id || !idsProjetsTermines.has(e.demande_id))
    ) ?? [];

  // Notes avec rappel (29/08) — "En retard" prime sur "Aujourd'hui" : une
  // note dont le rappel est passé y reste tant qu'elle n'est pas faite.
  const notesEnRetard = notesAvecRappel.filter((n) => new Date(n.rappel_a as string).getTime() < maintenant.getTime());
  const notesAujourdhui = notesAvecRappel.filter((n) => {
    const t = new Date(n.rappel_a as string).getTime();
    return t >= maintenant.getTime() && t < finJourParis.getTime();
  });

  const projetsNouveaux = listeProjets.filter((p) => p.statut === "nouveau");
  const projetsSansDevis = listeProjets.filter((p) => p.statut === "analyse");

  // L'argent : la même fonction que la page Argent (lib/argent.ts).
  const argent = calculerArgent({ devis: devisListPlat, factures: facturesDues, projets: listeProjets, maintenant });
  const devisAValider = argent.devisAEnvoyer.filter((d) => d.quoi === "Devis à relire");
  const devisPretsAEnvoyer = argent.devisAEnvoyer.filter((d) => d.quoi === "Devis à envoyer");

  // ---- Le soir : Fermer la journée ------------------------------------------
  // Actif à partir de 17 h, dès qu'il existe au moins un projet (un compte
  // tout neuf n'a pas de journée à fermer).
  const fermeture: Fermeture | null =
    estLeSoir && listeProjets.length > 0
      ? construireFermeture({
          cleJour: `${jourParis.annee}-${String(jourParis.mois + 1).padStart(2, "0")}-${String(jourParis.jour).padStart(2, "0")}`,
          debutJour: debutJourParis,
          finJour: finJourParis,
          maintenant,
          projets: listeProjets,
          devis: devisListPlat,
          nbFactures: nbFacturesDuJour ?? 0,
          evenementsDuJour: evenementsAujourdhuiPlat,
          evenementsPasses: aConfirmerBrutPlat.filter((e) => !e.demande_id || !idsProjetsTermines.has(e.demande_id)),
          notes: notesAvecRappel,
          premierRdvDemain: aplatirDemandes(premierRdvDemainBrut as { date_heure: string; titre: string; demandes?: unknown }[] | null)[0] ?? null,
        })
      : null;
  const idsEnSuspens = new Set(fermeture?.suspens.map((e) => e.id) ?? []);
  const pasEnSuspens = (id: string) => !idsEnSuspens.has(id);

  const prochaineActionDuJour = determinerProchaineAction({
    rendezVousDuJour,
    devisAValider,
    projetsNouveaux,
    devisPretsAEnvoyer,
    rappelsDuJour,
    projetsSansDevis,
    enAttente: argent.enAttente,
    maintenant,
  });
  // Le soir, « Fermer la journée » prend la place de « Maintenant ».
  const prochaineAction = fermeture ? null : prochaineActionDuJour;
  // L'élément mis en avant dans « Maintenant » n'est pas répété plus bas.
  const pasMisEnAvant = (id: string) => prochaineAction?.id !== id;

  // ---- 3. Aujourd'hui : une seule liste triée par heure -----------------
  const elementsJour: ElementJour[] = [
    ...notesEnRetard.filter((n) => pasEnSuspens(n.id)).map((n) => ({
      cle: `note-${n.id}`,
      genre: "note" as const,
      noteId: n.id,
      date: n.rappel_a as string,
      enRetard: true,
      principal: n.titre,
      secondaire: n.demandes?.nom_client,
      href: n.demande_id ? `/dashboard/demandes/${n.demande_id}` : "/dashboard/notes",
    })),
    ...[
      ...rendezVousDuJour.filter((e) => pasMisEnAvant(e.id) && pasEnSuspens(e.id)).map((e) => ({
        cle: `rdv-${e.id}`,
        genre: "rdv" as const,
        date: e.date_heure,
        enRetard: false,
        principal: nomClientDe(e) ?? e.titre,
        secondaire: nomClientDe(e) ? e.titre : undefined,
        href: e.demande_id ? `/dashboard/demandes/${e.demande_id}` : "/dashboard/planning",
      })),
      ...notesAujourdhui.filter((n) => pasEnSuspens(n.id)).map((n) => ({
        cle: `note-${n.id}`,
        genre: "note" as const,
        noteId: n.id,
        date: n.rappel_a as string,
        enRetard: false,
        principal: n.titre,
        secondaire: n.demandes?.nom_client,
        href: n.demande_id ? `/dashboard/demandes/${n.demande_id}` : "/dashboard/notes",
      })),
      ...rappelsDuJour.filter((e) => pasMisEnAvant(e.id) && pasEnSuspens(e.id)).map((e) => ({
        cle: `tache-${e.id}`,
        genre: "tache" as const,
        date: e.date_heure,
        enRetard: false,
        principal: e.titre,
        secondaire: nomClientDe(e),
        href: e.demande_id ? `/dashboard/demandes/${e.demande_id}` : "/dashboard/planning",
      })),
    ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
  ];

  // ---- 4. À faire de votre côté ------------------------------------------
  const aProduire = [
    ...projetsNouveaux.map((p) => ({ id: p.id, href: `/dashboard/demandes/${p.id}`, nom: p.nom_client, verbe: "Nouveau projet à cadrer" })),
    ...projetsSansDevis.map((p) => ({ id: p.id, href: `/dashboard/demandes/${p.id}`, nom: p.nom_client, verbe: "Devis à préparer" })),
    // Refonte (02/10) — un devis à relire ou à envoyer s'ouvre sur le devis
    // lui-même, plus sur la fiche projet (un geste de moins).
    ...argent.devisAEnvoyer.map((d) => ({ id: d.id, href: d.href, nom: d.nom, verbe: d.quoi })),
  ].filter((l) => pasMisEnAvant(l.id));

  // ---- 5. En attente du client --------------------------------------------
  const enAttente = argent.enAttente.filter((l) => pasMisEnAvant(l.id));

  const premierPrenom = (profil?.nom ?? "").split(" ")[0];
  const dateDuJour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
  const aConfirmerAffiches = aConfirmerActifs.filter((e) => pasEnSuspens(e.id));
  const rienAFaire =
    !fermeture &&
    !prochaineAction &&
    elementsJour.length === 0 &&
    aConfirmerAffiches.length === 0 &&
    projetsAConfirmerTermine.length === 0 &&
    aProduire.length === 0 &&
    enAttente.length === 0;

  return (
    <VueAccueil
      dateDuJour={dateDuJour}
      titre={listeProjets.length === 0 ? "Bienvenue sur Compyo." : `Bonjour ${premierPrenom}`}
      premierProjet={listeProjets.length === 0}
      prochaineAction={prochaineAction}
      fermeture={fermeture}
      aConfirmer={aConfirmerAffiches}
      chantiersAConfirmer={projetsAConfirmerTermine}
      elementsJour={elementsJour}
      aProduire={aProduire}
      enAttente={enAttente}
      rienAFaire={rienAFaire}
    />
  );
}

function nomClientDe(item: unknown): string | undefined {
  return (item as { demandes?: { nom_client?: string } })?.demandes?.nom_client;
}

const HEURE_PARIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "2-digit" });
const heureCourte = (iso: string) => HEURE_PARIS.format(new Date(iso)).replace(":", "h");
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

// « Fermer la journée » : tout est calculé, rien n'est demandé à l'IA.
function construireFermeture(d: {
  cleJour: string;
  debutJour: Date;
  finJour: Date;
  maintenant: Date;
  projets: Projet[];
  devis: { envoye_le?: string | null }[];
  nbFactures: number;
  evenementsDuJour: { type: string; statut: string; date_heure: string }[];
  evenementsPasses: { id: string; type: string; titre: string; date_heure: string; demande_id: string | null; demandes?: { nom_client?: string } | null }[];
  notes: { id: string; titre: string; rappel_a: string | null; demandes?: { nom_client?: string } | null }[];
  premierRdvDemain: { date_heure: string; titre: string; demandes?: { nom_client?: string; adresse_client?: string } | null } | null;
}): Fermeture {
  const debut = d.debutJour.getTime();
  const depuisCeMatin = (iso: string | null | undefined) => !!iso && Date.parse(iso) >= debut;

  // Aujourd'hui : des chiffres, pas des phrases. Rien si tout est à zéro.
  const nbProjets = d.projets.filter((p) => depuisCeMatin(p.created_at)).length;
  const nbDevis = d.devis.filter((x) => depuisCeMatin(x.envoye_le)).length;
  const nbRdv = d.evenementsDuJour.filter((e) => e.type === "rendez_vous" && e.statut === "termine").length;
  const bilan = [
    nbProjets > 0 && pluriel(nbProjets, "projet capté", "projets captés"),
    nbDevis > 0 && pluriel(nbDevis, "devis envoyé", "devis envoyés"),
    d.nbFactures > 0 && pluriel(d.nbFactures, "facture émise", "factures émises"),
    nbRdv > 0 && pluriel(nbRdv, "rendez-vous fait", "rendez-vous faits"),
  ].filter((x): x is string => Boolean(x));

  // En suspens : les notes dues aujourd'hui (et celles déjà en retard),
  // puis les rendez-vous et rappels d'aujourd'hui passés sans confirmation.
  // Les rendez-vous plus anciens restent dans « À confirmer » : ils
  // demandent une vraie réponse (replanifier), pas un report.
  const notes: ElementSuspens[] = d.notes
    .filter((n) => n.rappel_a && Date.parse(n.rappel_a) < d.finJour.getTime())
    .sort((a, b) => Date.parse(a.rappel_a as string) - Date.parse(b.rappel_a as string))
    .map((n) => ({
      cle: `note-${n.id}`,
      genre: "note",
      id: n.id,
      principal: n.titre,
      secondaire: n.demandes?.nom_client,
      date: n.rappel_a as string,
    }));
  const evenements: ElementSuspens[] = d.evenementsPasses
    .filter((e) => Date.parse(e.date_heure) >= debut && Date.parse(e.date_heure) < d.maintenant.getTime())
    .sort((a, b) => Date.parse(a.date_heure) - Date.parse(b.date_heure))
    .map((e) => ({
      cle: `evenement-${e.id}`,
      genre: "evenement",
      id: e.id,
      principal: e.demandes?.nom_client ?? e.titre,
      secondaire: `${heureCourte(e.date_heure)} · ${e.demandes?.nom_client ? e.titre : e.type === "rendez_vous" ? "Rendez-vous" : "Rappel"}`,
      date: e.date_heure,
      rdv: e.type === "rendez_vous",
      demandeId: e.demande_id,
    }));

  const r = d.premierRdvDemain;
  const demain = r
    ? [heureCourte(r.date_heure), r.demandes?.nom_client ?? r.titre, r.demandes?.adresse_client].filter(Boolean).join(" · ")
    : null;

  return { cleJour: d.cleJour, bilan, suspens: [...evenements, ...notes], demain };
}

// UNE seule action, la plus utile à traiter maintenant, ou null. L'ordre
// des `if` EST la priorité. Les confirmations n'y figurent plus : elles ont
// leur bloc juste en dessous, avec les boutons pour y répondre.
function determinerProchaineAction(listes: {
  rendezVousDuJour: { id: string; titre: string; demande_id: string | null; date_heure: string }[];
  devisAValider: { id: string; href: string; nom: string }[];
  projetsNouveaux: Projet[];
  devisPretsAEnvoyer: { id: string; href: string; nom: string }[];
  rappelsDuJour: { id: string; titre: string; demande_id: string | null }[];
  projetsSansDevis: Projet[];
  enAttente: LigneEnAttente[];
  maintenant: Date;
}): ActionAccueil | null {
  const lien = (demandeId: string | null, repli: string) => (demandeId ? `/dashboard/demandes/${demandeId}` : repli);

  const prochainRdv = listes.rendezVousDuJour.find((e) => new Date(e.date_heure) >= new Date(listes.maintenant.getTime() - 60 * 60000));
  if (prochainRdv) {
    const heure = new Date(prochainRdv.date_heure)
      .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
      .replace(":", "h");
    return {
      id: prochainRdv.id,
      texte: nomClientDe(prochainRdv) ? `${heure} — ${nomClientDe(prochainRdv)}` : `${heure} — ${prochainRdv.titre}`,
      detail: nomClientDe(prochainRdv) ? prochainRdv.titre : undefined,
      href: lien(prochainRdv.demande_id, "/dashboard/planning"),
    };
  }
  const devis = listes.devisAValider[0];
  if (devis) return { id: devis.id, texte: `Relire le devis ${devis.nom}`, href: devis.href };
  const nouveau = listes.projetsNouveaux[0];
  if (nouveau) return { id: nouveau.id, texte: `Cadrer le projet ${nouveau.nom_client}`, href: `/dashboard/demandes/${nouveau.id}` };
  const pret = listes.devisPretsAEnvoyer[0];
  if (pret) return { id: pret.id, texte: `Envoyer le devis ${pret.nom}`, href: pret.href };
  const rappel = listes.rappelsDuJour[0];
  if (rappel) return { id: rappel.id, texte: rappel.titre, href: lien(rappel.demande_id, "/dashboard/planning") };
  const sansDevis = listes.projetsSansDevis[0];
  if (sansDevis) return { id: sansDevis.id, texte: `Préparer le devis de ${sansDevis.nom_client}`, href: `/dashboard/demandes/${sansDevis.id}` };
  // Les factures d'abord, puis les devis ; le plus ancien en premier.
  const relance =
    listes.enAttente.find((l) => l.genre === "facture" && l.relance) ?? listes.enAttente.find((l) => l.genre === "devis" && l.relance);
  if (relance?.relance)
    return {
      id: relance.id,
      texte: `Relancer ${relance.nom}`,
      detail: `${relance.quoi} depuis ${relance.jours} j`,
      href: relance.relance,
    };
  return null;
}
