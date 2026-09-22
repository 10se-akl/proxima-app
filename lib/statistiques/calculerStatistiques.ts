import type { SupabaseClient } from "@supabase/supabase-js";
import { aujourdhuiParis, bornes, decaler, memeMois, moisCourant, type Mois } from "@/lib/moisParis";

// ============================================================
// Statistiques d'Axel (Module 44, 22/09) — ce que lit /admin/statistiques.
//
// Deux sources, une seule page :
//   - le SITE : la table `visites`, remplie par la mesure d'audience
//     maison (app/api/visite/route.ts) ;
//   - l'APP : les événements que Compyo enregistre déjà à chaque action
//     (evenements_projet — projets, notes vocales, devis…). Aucune mesure
//     supplémentaire : ces données existaient, personne ne les lisait.
//
// Les comptes de test n'entrent dans AUCUN chiffre de l'app : ceux marqués
// « exclus » sur la page, et d'office l'organisation d'Axel.
//
// Supabase ne renvoie que 1 000 lignes par requête : tout se lit par pages
// (voir toutesLesLignes) — sinon un mois chargé serait tronqué sans que
// rien ne le signale.
// ============================================================

type Resultat<T> = { data: T[] | null; error: { message: string } | null };

async function toutesLesLignes<T>(
  lire: (de: number, a: number) => PromiseLike<Resultat<T>>,
  plafond = 100_000
): Promise<{ lignes: T[]; erreur: string | null }> {
  const lignes: T[] = [];
  for (let de = 0; de < plafond; de += 1000) {
    const { data, error } = await lire(de, de + 999);
    if (error) return { lignes, erreur: error.message };
    lignes.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { lignes, erreur: null };
}

// ---- Libellés -----------------------------------------------------------

const PAGES_CONNUES: Record<string, string> = {
  "/": "Accueil",
  "/demander-acces": "Demande d'accès",
  "/login": "Connexion",
  "/installer": "Installer l'app",
  "/fonctionnalites": "Fonctionnalités",
  "/comment-ca-fonctionne": "Comment ça fonctionne",
  "/pourquoi-compyo": "Pourquoi Compyo",
  "/comparatif": "Comparatif",
  "/confiance": "Sécurité & transparence",
  "/carte-mentale": "Carte mentale",
  "/beta": "Bêta",
  "/a-propos": "À propos",
  "/contact": "Contact",
  "/candidature-en-cours": "Candidature en cours",
  "/devis/[id]": "Devis reçu par un client",
  "/dashboard": "Accueil de l'app",
  "/dashboard/demandes/[id]": "Fiche projet",
  "/dashboard/demandes/nouvelle": "Nouveau projet",
  "/dashboard/devis": "Liste des devis",
  "/dashboard/devis/[id]": "Espace devis",
  "/dashboard/factures": "Factures",
  "/dashboard/planning": "Planning",
  "/dashboard/bilan": "Bilan",
  "/dashboard/parametres": "Paramètres",
  "/dashboard/clients": "Clients",
  "/dashboard/notes": "Notes",
};

export function libellePage(chemin: string): string {
  if (PAGES_CONNUES[chemin]) return PAGES_CONNUES[chemin];
  if (chemin.startsWith("/metiers/")) return `Métier : ${chemin.slice(9)}`;
  return chemin;
}

// Les actions qui disent ce que les artisans FONT de Compyo. Les
// événements purement techniques (priorité changée, infos complétées…) ne
// sont pas des fonctionnalités et restent hors du classement.
const FONCTIONNALITES: Record<string, string> = {
  projet_cree: "Projets créés",
  message_importe: "Messages importés",
  note_vocale_ajoutee: "Notes vocales",
  note_ajoutee: "Notes écrites",
  photo_ajoutee: "Photos de chantier",
  analyse_ia: "Analyses par l'IA",
  devis_genere: "Devis préparés",
  devis_envoye: "Devis envoyés",
  devis_accepte: "Devis acceptés",
  facture_creee: "Factures créées",
  facture_payee: "Factures encaissées",
  rdv_planifie: "Rendez-vous planifiés",
  visite_effectuee: "Visites de chantier",
  appel_telephonique: "Appels notés",
  chantier_demarre: "Chantiers démarrés",
  chantier_termine: "Chantiers terminés",
  journal_chantier_interprete: "Journal de chantier",
};

const NOMS_APPAREILS: Record<string, string> = {
  mobile: "Téléphone",
  tablette: "Tablette",
  ordinateur: "Ordinateur",
};

// ---- Types --------------------------------------------------------------

export type Part = { nom: string; valeur: number };

export type CompteStats = {
  id: string;
  nom: string;
  exclu: boolean;
  estAdmin: boolean;
  derniereActivite: string | null;
};

export type Statistiques = {
  mois: Mois;
  enCours: boolean;
  jourCompare: number | null;
  migrationManquante: boolean;
  site: {
    visiteurs: number;
    pagesVues: number;
    precedent: { visiteurs: number; pagesVues: number };
    parJour: { jour: number; visiteurs: number }[];
    appareils: Part[];
    pages: Part[];
    origines: Part[];
    pays: Part[];
    navigateurs: Part[];
  };
  app: {
    comptes: number;
    artisansActifs: number;
    nouveauxComptes: number;
    candidatures: number;
    precedent: { artisansActifs: number; candidatures: number };
    ecrans: Part[];
    fonctionnalites: { nom: string; actions: number; artisans: number }[];
    // Deux parcours séparés : mélanger les nouveaux venus du mois et
    // l'ensemble des artisans donnait des passages à « 200 % » (un
    // artisan inscrit en juillet qui crée un projet en septembre).
    acquisition: Part[];
    activation: Part[];
    inactifs: { nom: string; jours: number | null }[];
  };
  comptes: CompteStats[];
};

type Visite = {
  cree_le: string;
  chemin: string;
  origine: string | null;
  appareil: string;
  navigateur: string | null;
  pays: string | null;
  visiteur: string;
};

type Evenement = { organisation_id: string; type: string; created_at: string };

const JOUR_MS = 86_400_000;
const SEUIL_INACTIVITE_JOURS = 14;

function dansPeriode(iso: string, debut: Date, fin: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= debut.getTime() && t < fin.getTime();
}

// Nombre de visiteurs distincts par valeur d'un champ, trié, avec un
// « Autres » pour ne pas noyer un camembert sous les petites parts.
function repartition(visites: Visite[], champ: (v: Visite) => string | null, max: number, autre = "Autres"): Part[] {
  const parValeur = new Map<string, Set<string>>();
  for (const v of visites) {
    const cle = champ(v);
    if (!cle) continue;
    if (!parValeur.has(cle)) parValeur.set(cle, new Set());
    parValeur.get(cle)!.add(v.visiteur);
  }
  const tri = Array.from(parValeur, ([nom, s]) => ({ nom, valeur: s.size })).sort((a, b) => b.valeur - a.valeur);
  if (tri.length <= max) return tri;
  const reste = tri.slice(max - 1).reduce((s, p) => s + p.valeur, 0);
  return [...tri.slice(0, max - 1), { nom: autre, valeur: reste }];
}

function compter<T>(elements: T[], cle: (e: T) => string, max: number): Part[] {
  const n = new Map<string, number>();
  for (const e of elements) n.set(cle(e), (n.get(cle(e)) ?? 0) + 1);
  return Array.from(n, ([nom, valeur]) => ({ nom, valeur }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, max);
}

export async function calculerStatistiques(
  admin: SupabaseClient,
  mois: Mois,
  emailAdmin: string | undefined,
  maintenant = new Date()
): Promise<Statistiques> {
  const courant = moisCourant(maintenant);
  const enCours = memeMois(mois, courant);
  const { debut, fin: finMois } = bornes(mois);
  const fin = enCours ? maintenant : finMois;
  const precedent = bornes(decaler(mois, -1));
  const jourCompare = enCours ? aujourdhuiParis(maintenant).jour : null;
  const finComparaison = enCours
    ? new Date(Math.min(precedent.debut.getTime() + (maintenant.getTime() - debut.getTime()), precedent.fin.getTime()))
    : precedent.fin;

  // ---- Comptes et exclusions -------------------------------------------
  let migrationManquante = false;
  let lectureOrgs = await admin.from("organisations").select("id, nom, created_at, exclue_des_stats");
  if (lectureOrgs.error) {
    // Module 44 pas encore appliqué : la colonne d'exclusion n'existe pas.
    migrationManquante = true;
    lectureOrgs = (await admin.from("organisations").select("id, nom, created_at")) as typeof lectureOrgs;
  }
  const organisations = (lectureOrgs.data ?? []) as {
    id: string;
    nom: string;
    created_at: string;
    exclue_des_stats?: boolean;
  }[];

  const { data: profilAdmin } = emailAdmin
    ? await admin.from("profils").select("id").eq("email", emailAdmin).maybeSingle()
    : { data: null };
  const { data: membershipsAdmin } = profilAdmin
    ? await admin.from("memberships").select("organisation_id").eq("user_id", profilAdmin.id)
    : { data: [] };
  const orgsAdmin = new Set((membershipsAdmin ?? []).map((m) => m.organisation_id as string));
  const exclues = new Set(
    organisations.filter((o) => o.exclue_des_stats || orgsAdmin.has(o.id)).map((o) => o.id)
  );
  const orgsComptees = organisations.filter((o) => !exclues.has(o.id));

  // Membres des organisations exclues : leurs candidatures ne comptent pas.
  const { data: membresExclus } = exclues.size
    ? await admin.from("memberships").select("user_id").in("organisation_id", Array.from(exclues))
    : { data: [] };
  const utilisateursExclus = new Set((membresExclus ?? []).map((m) => m.user_id as string));

  // ---- Lectures (par pages) ----------------------------------------------
  const [lectureVisites, lectureEvenements, lectureDernieres, lectureCandidatures] = await Promise.all([
    toutesLesLignes<Visite>((de, a) =>
      admin
        .from("visites")
        .select("cree_le, chemin, origine, appareil, navigateur, pays, visiteur")
        .gte("cree_le", precedent.debut.toISOString())
        .lt("cree_le", fin.toISOString())
        .order("cree_le")
        .range(de, a)
    ),
    toutesLesLignes<Evenement>((de, a) =>
      admin
        .from("evenements_projet")
        .select("organisation_id, type, created_at")
        .gte("created_at", precedent.debut.toISOString())
        .lt("created_at", fin.toISOString())
        .order("created_at")
        .range(de, a)
    ),
    // Dernière activité de chaque compte : les 90 derniers jours suffisent,
    // au-delà on dit simplement « plus de 90 jours ».
    toutesLesLignes<Evenement>((de, a) =>
      admin
        .from("evenements_projet")
        .select("organisation_id, type, created_at")
        .gte("created_at", new Date(maintenant.getTime() - 90 * JOUR_MS).toISOString())
        .order("created_at", { ascending: false })
        .range(de, a)
    ),
    toutesLesLignes<{ created_at: string; statut: string; user_id: string | null; email: string }>((de, a) =>
      admin
        .from("candidatures")
        .select("created_at, statut, user_id, email")
        .gte("created_at", precedent.debut.toISOString())
        .lt("created_at", fin.toISOString())
        .range(de, a)
    ),
  ]);
  if (lectureVisites.erreur) migrationManquante = true;

  // ---- Le site -------------------------------------------------------------
  const estPageDuSite = (v: Visite) => !v.chemin.startsWith("/dashboard");
  const visitesMois = lectureVisites.lignes.filter((v) => dansPeriode(v.cree_le, debut, fin));
  const visitesPrecedent = lectureVisites.lignes.filter((v) => dansPeriode(v.cree_le, precedent.debut, finComparaison));
  const site = visitesMois.filter(estPageDuSite);
  const sitePrecedent = visitesPrecedent.filter(estPageDuSite);
  // L'empreinte change chaque jour : un visiteur distinct = une visite
  // d'une journée. Deux jours de suite, c'est deux visites.
  const visiteurs = (liste: Visite[]) => new Set(liste.map((v) => v.visiteur)).size;

  const joursDuMois = Math.round((finMois.getTime() - debut.getTime()) / JOUR_MS);
  const parJour = Array.from({ length: joursDuMois }, (_, i) => ({ jour: i + 1, visiteurs: new Set<string>() }));
  for (const v of site) {
    const j = Number(
      new Date(v.cree_le).toLocaleDateString("fr-FR", { day: "numeric", timeZone: "Europe/Paris" })
    );
    parJour[j - 1]?.visiteurs.add(v.visiteur);
  }

  const visiteursSite = visiteurs(site);
  const origines = repartition(site, (v) => v.origine, 7);
  const sansOrigine = visiteursSite - origines.reduce((s, o) => s + o.valeur, 0);
  if (sansOrigine > 0) origines.push({ nom: "Accès direct ou inconnu", valeur: sansOrigine });

  // ---- L'app ---------------------------------------------------------------
  const compte = (e: Evenement) => !exclues.has(e.organisation_id);
  const evenementsMois = lectureEvenements.lignes.filter((e) => compte(e) && dansPeriode(e.created_at, debut, fin));
  const evenementsPrecedent = lectureEvenements.lignes.filter(
    (e) => compte(e) && dansPeriode(e.created_at, precedent.debut, finComparaison)
  );
  const actifs = (liste: Evenement[]) => new Set(liste.map((e) => e.organisation_id)).size;

  const fonctionnalites = Object.entries(FONCTIONNALITES)
    .map(([type, nom]) => {
      const lignes = evenementsMois.filter((e) => e.type === type);
      return { nom, actions: lignes.length, artisans: new Set(lignes.map((e) => e.organisation_id)).size };
    })
    .filter((f) => f.actions > 0)
    .sort((a, b) => b.artisans - a.artisans || b.actions - a.actions);

  const candidatureComptee = (c: { user_id: string | null; email: string }) =>
    !(c.user_id && utilisateursExclus.has(c.user_id)) && c.email !== emailAdmin;
  const candidaturesMois = lectureCandidatures.lignes.filter(
    (c) => candidatureComptee(c) && dansPeriode(c.created_at, debut, fin)
  );
  const candidaturesPrecedent = lectureCandidatures.lignes.filter(
    (c) => candidatureComptee(c) && dansPeriode(c.created_at, precedent.debut, finComparaison)
  );

  // De la visite au compte : les nouveaux venus du mois.
  const acquisition: Part[] = [
    { nom: "Visiteurs du site", valeur: visiteursSite },
    { nom: "Candidatures", valeur: candidaturesMois.length },
    { nom: "Comptes ouverts", valeur: candidaturesMois.filter((c) => c.statut === "accepted").length },
  ];
  // Du compte au devis signé : TOUS les artisans, chaque étape étant un
  // sous-ensemble de la précédente — jamais plus de 100 %.
  const aFait = (type: string) =>
    new Set(evenementsMois.filter((e) => e.type === type).map((e) => e.organisation_id));
  const projet = aFait("projet_cree");
  const envoye = new Set(Array.from(aFait("devis_envoye")).filter((o) => projet.has(o)));
  const accepte = new Set(Array.from(aFait("devis_accepte")).filter((o) => envoye.has(o)));
  const activation: Part[] = [
    { nom: "Comptes", valeur: orgsComptees.length },
    { nom: "Ont créé un projet", valeur: projet.size },
    { nom: "Puis envoyé un devis", valeur: envoye.size },
    { nom: "Puis eu un devis accepté", valeur: accepte.size },
  ];

  // Dernière activité : les lignes arrivent de la plus récente à la plus
  // ancienne, la première vue pour un compte est donc la bonne.
  const derniere = new Map<string, string>();
  for (const e of lectureDernieres.lignes) {
    if (!derniere.has(e.organisation_id)) derniere.set(e.organisation_id, e.created_at);
  }
  const joursDepuis = (iso: string | undefined) =>
    iso ? Math.floor((maintenant.getTime() - new Date(iso).getTime()) / JOUR_MS) : null;
  const inactifs = orgsComptees
    .map((o) => ({ nom: o.nom, jours: joursDepuis(derniere.get(o.id)) }))
    .filter((o) => o.jours === null || o.jours >= SEUIL_INACTIVITE_JOURS)
    .sort((a, b) => (b.jours ?? Infinity) - (a.jours ?? Infinity));

  return {
    mois,
    enCours,
    jourCompare,
    migrationManquante,
    site: {
      visiteurs: visiteursSite,
      pagesVues: site.length,
      precedent: { visiteurs: visiteurs(sitePrecedent), pagesVues: sitePrecedent.length },
      parJour: parJour.map((j) => ({ jour: j.jour, visiteurs: j.visiteurs.size })),
      appareils: repartition(site, (v) => NOMS_APPAREILS[v.appareil] ?? v.appareil, 3),
      pages: compter(site, (v) => libellePage(v.chemin), 10),
      origines,
      pays: repartition(site, (v) => v.pays, 6),
      navigateurs: repartition(site, (v) => v.navigateur, 6),
    },
    app: {
      comptes: orgsComptees.length,
      artisansActifs: actifs(evenementsMois),
      nouveauxComptes: orgsComptees.filter((o) => dansPeriode(o.created_at, debut, fin)).length,
      candidatures: candidaturesMois.length,
      precedent: { artisansActifs: actifs(evenementsPrecedent), candidatures: candidaturesPrecedent.length },
      ecrans: compter(
        visitesMois.filter((v) => v.chemin.startsWith("/dashboard")),
        (v) => libellePage(v.chemin),
        10
      ),
      fonctionnalites,
      acquisition,
      activation,
      inactifs,
    },
    comptes: organisations
      .map((o) => ({
        id: o.id,
        nom: o.nom,
        exclu: exclues.has(o.id),
        estAdmin: orgsAdmin.has(o.id),
        derniereActivite: derniere.get(o.id) ?? null,
      }))
      .sort((a, b) => Number(a.exclu) - Number(b.exclu) || a.nom.localeCompare(b.nom, "fr")),
  };
}
