// ============================================================
// Projection de Compyo, JOUR PAR JOUR (05/10, élargie le 06/10).
//
// Page /admin/projection, réservée à Axel. Ce n'est pas une prédiction :
// chaque nombre ci-dessous est une hypothèse réglable, écrite en clair
// dans la page. Le calcul est pur (aucune base, aucun réseau) : il tourne
// dans le navigateur à chaque réglage.
//
// D'où viennent les clients : bouche-à-oreille, démarchage d'Axel (qui
// double dès que les premiers clients restent), Google et réseaux
// sociaux, publicité, partenaires, commerciaux (automatiques ou recrutés à
// la main). Où va l'argent : IA et hébergement, équipe, publicité,
// étranger, le reste (comptable, assurances, juridique…), le salaire
// d'Axel, les dépenses ponctuelles, les intérêts d'un prêt.
// Ce qui arrive dans sa poche : salaire net chaque fin de mois, dividendes
// nets chaque fin d'exercice (sa part seulement, après une levée de fonds).
//
// 06/10 — tout devient réglable : la durée (1 à 15 ans), le salaire (fixe
// ou selon le chiffre d'affaires), les recrutements à la main, les
// événements ponctuels (dépense, recette, levée de fonds, prêt, choc sur
// l'acquisition), les marchés du monde un par un, la saisonnalité du
// bâtiment, l'inflation, la hausse du prix, et chaque paramètre de chaque
// scénario.
// ============================================================

export type IdScenario = "pire" | "prudent" | "reussite" | "meilleur";

export type Scenario = {
  id: IdScenario;
  label: string;
  resume: string;
  fondEtud: number; // clients/mois trouvés par Axel pendant ses études
  fondPlein: number; // … une fois à plein temps
  seoMax: number; // clients/mois venus de Google, après 3 ans
  bao: number; // % des clients qui font venir un collègue chaque mois
  partenaires: number; // clients/mois via négoces et fédérations
  partenairesDes: number; // à partir du mois N après le lancement
  pubPct: number; // % du chiffre d'affaires en publicité
  pubDes: number; // la publicité démarre N mois après le lancement
  cac: number; // coût d'un client en publicité au départ (€)
  churnDebut: number; // % de clients qui partent chaque mois au début
  churnFin: number; // … une fois le produit mûr (4 ans)
  commerciaux: number[]; // seuils de clients pour embaucher chaque commercial
  social: number; // clients/mois venus de TikTok, Instagram, Facebook, après 9 mois
  pubMin: number; // budget publicitaire minimum par mois dès que la pub démarre (€)
  capFrance: number; // clients au plus en France : la part de marché que le scénario peut tenir
};

export const SCENARIOS: Scenario[] = [
  {
    id: "pire", label: "Pire cas", resume: "Le marché suit mal : peu de bouche-à-oreille, pas de publicité, des départs fréquents.",
    fondEtud: 4, fondPlein: 6, seoMax: 3, bao: 1.2, partenaires: 0, partenairesDes: 999,
    pubPct: 0, pubDes: 999, cac: 220, churnDebut: 4.0, churnFin: 3.5, commerciaux: [],
    social: 1, pubMin: 0, capFrance: 2500,
  },
  {
    id: "prudent", label: "Prudent", resume: "Ça prend doucement : un peu de publicité, quelques partenaires, un commercial à 1 500 clients.",
    fondEtud: 6, fondPlein: 10, seoMax: 6, bao: 2.0, partenaires: 2, partenairesDes: 36,
    pubPct: 5, pubDes: 3, cac: 200, churnDebut: 3.2, churnFin: 2.7, commerciaux: [1500],
    social: 5, pubMin: 300, capFrance: 5000,
  },
  {
    id: "reussite", label: "Belle réussite", resume: "Le bouche-à-oreille démarre, la publicité rapporte, l'équipe grandit, la Belgique et la Suisse suivent.",
    fondEtud: 10, fondPlein: 16, seoMax: 15, bao: 3.0, partenaires: 8, partenairesDes: 24,
    pubPct: 10, pubDes: 0, cac: 160, churnDebut: 2.8, churnFin: 2.0, commerciaux: [1000, 2500, 5000],
    social: 15, pubMin: 1000, capFrance: 18000,
  },
  {
    id: "meilleur", label: "Meilleur cas", resume: "Tout marche : Compyo devient une référence en France, puis en Espagne et en Italie.",
    fondEtud: 15, fondPlein: 25, seoMax: 30, bao: 4.2, partenaires: 20, partenairesDes: 18,
    pubPct: 15, pubDes: 0, cac: 140, churnDebut: 2.5, churnFin: 1.6, commerciaux: [700, 1800, 3500, 6000, 9000, 13000, 18000],
    social: 35, pubMin: 2500, capFrance: 40000,
  },
];

/** Les paramètres d'un scénario qu'on peut ajuster dans la page. */
export const CHAMPS_SCENARIO: { cle: Exclude<keyof Scenario, "id" | "label" | "resume" | "commerciaux">; label: string; suffixe: string; pas: number }[] = [
  { cle: "fondEtud", label: "Ton démarchage pendant tes études", suffixe: "clients/mois", pas: 1 },
  { cle: "fondPlein", label: "Ton démarchage à plein temps", suffixe: "clients/mois", pas: 1 },
  { cle: "bao", label: "Bouche-à-oreille", suffixe: "% des clients/mois", pas: 0.1 },
  { cle: "seoMax", label: "Google, après 3 ans", suffixe: "clients/mois", pas: 1 },
  { cle: "social", label: "Réseaux sociaux, après 9 mois", suffixe: "clients/mois", pas: 1 },
  { cle: "partenaires", label: "Partenaires (négoces, fédérations)", suffixe: "clients/mois", pas: 1 },
  { cle: "partenairesDes", label: "Partenaires à partir de", suffixe: "mois après le lancement", pas: 1 },
  { cle: "pubPct", label: "Budget publicité", suffixe: "% du chiffre d'affaires", pas: 1 },
  { cle: "pubMin", label: "Budget publicité minimum", suffixe: "€/mois", pas: 100 },
  { cle: "pubDes", label: "Publicité à partir de", suffixe: "mois après le lancement", pas: 1 },
  { cle: "cac", label: "Coût d'un client en publicité", suffixe: "€", pas: 10 },
  { cle: "churnDebut", label: "Départs au début", suffixe: "% des clients/mois", pas: 0.1 },
  { cle: "churnFin", label: "Départs une fois le produit mûr", suffixe: "% des clients/mois", pas: 0.1 },
  { cle: "capFrance", label: "Plafond en France", suffixe: "entreprises clientes", pas: 500 },
];

// Fonctionnalités et techniques : chaque levier a un effet supposé, écrit
// dans la page. « Ce qui rapporte le plus » les compare en les retirant
// un par un.
export type IdLevier =
  | "parrainage" | "factureElectronique" | "importDevis" | "rapportChantier"
  | "horsLigne" | "partenariats" | "publicite" | "referencement";

export type Levier = { id: IdLevier; label: string; type: "fonctionnalité" | "technique"; effet: string };

export const LEVIERS: Levier[] = [
  { id: "factureElectronique", type: "fonctionnalité", label: "Facture électronique (plateforme agréée)", effet: "15 % de départs en moins, 0,40 € de plus par client" },
  { id: "importDevis", type: "fonctionnalité", label: "Import d'un ancien devis à l'inscription", effet: "10 % de départs en moins (le premier devis n'est plus vide)" },
  { id: "rapportChantier", type: "fonctionnalité", label: "Rapport de fin de chantier + avis Google", effet: "20 % de bouche-à-oreille en plus" },
  { id: "horsLigne", type: "fonctionnalité", label: "Capture sans réseau", effet: "5 % de départs en moins" },
  { id: "parrainage", type: "technique", label: "Parrainage (un mois offert)", effet: "35 % de bouche-à-oreille en plus, un mois offert par filleul" },
  { id: "partenariats", type: "technique", label: "Partenariats (négoces, fédérations)", effet: "les clients « partenaires » du scénario, 60 € de commission chacun" },
  { id: "publicite", type: "technique", label: "Publicité payante", effet: "le budget du scénario, un client coûte plus cher quand le budget grossit" },
  { id: "referencement", type: "technique", label: "Référencement Google (pages métier, contenu)", effet: "sans lui, Google apporte deux fois moins de clients" },
];

// ------------------------------------------------------------ marchés

/** Un marché (un pays ou un groupe de pays). Les tailles sont des ordres
 *  de grandeur à vérifier : entreprises du bâtiment, surtout des TPE. */
export type Marche = {
  id: string;
  nom: string;
  actif: boolean;
  entreprises: number; // entreprises du bâtiment visées
  seuil: number; // clients au total avant de s'y lancer
  lancement: number; // coût du lancement (traduction, juridique, campagne) en €
  coutMensuel: number; // présence sur place, support local, conformité (€/mois)
  poids: number; // force de l'acquisition, France = 1
  cacX: number; // le coût d'un client en publicité, × celui de France
  prixX: number; // le prix local, × le prix France (pouvoir d'achat)
  presence: number; // part de la part de marché française tenable (0 à 1)
  langues: number; // langues à ajouter (un développeur de plus par langue)
};

export const MARCHES_DEFAUT: Marche[] = [
  { id: "fr", nom: "France", actif: true, entreprises: 440000, seuil: 0, lancement: 0, coutMensuel: 0, poids: 1, cacX: 1, prixX: 1, presence: 1, langues: 0 },
  { id: "franco", nom: "Belgique, Suisse, Luxembourg", actif: true, entreprises: 80000, seuil: 1500, lancement: 25000, coutMensuel: 1300, poids: 0.25, cacX: 1.3, prixX: 1, presence: 0.4, langues: 0 },
  { id: "sud", nom: "Espagne et Italie", actif: true, entreprises: 500000, seuil: 5000, lancement: 120000, coutMensuel: 2600, poids: 1.2, cacX: 1.4, prixX: 0.9, presence: 0.4, langues: 2 },
  { id: "quebec", nom: "Québec et Canada", actif: false, entreprises: 90000, seuil: 3000, lancement: 70000, coutMensuel: 1800, poids: 0.3, cacX: 1.6, prixX: 1.1, presence: 0.35, langues: 0 },
  { id: "afrique", nom: "Afrique francophone", actif: false, entreprises: 300000, seuil: 6000, lancement: 80000, coutMensuel: 1500, poids: 0.5, cacX: 0.6, prixX: 0.3, presence: 0.3, langues: 0 },
  { id: "portugal", nom: "Portugal", actif: false, entreprises: 90000, seuil: 8000, lancement: 50000, coutMensuel: 1200, poids: 0.25, cacX: 1.2, prixX: 0.75, presence: 0.35, langues: 1 },
  { id: "allemagne", nom: "Allemagne, Autriche", actif: false, entreprises: 450000, seuil: 10000, lancement: 250000, coutMensuel: 4000, poids: 1.1, cacX: 1.8, prixX: 1.15, presence: 0.3, langues: 1 },
  { id: "benelux", nom: "Pays-Bas", actif: false, entreprises: 150000, seuil: 10000, lancement: 120000, coutMensuel: 2500, poids: 0.4, cacX: 1.7, prixX: 1.15, presence: 0.3, langues: 1 },
  { id: "uk", nom: "Royaume-Uni, Irlande", actif: false, entreprises: 350000, seuil: 12000, lancement: 250000, coutMensuel: 4000, poids: 1, cacX: 1.9, prixX: 1.15, presence: 0.3, langues: 1 },
  { id: "usa", nom: "États-Unis", actif: false, entreprises: 3000000, seuil: 25000, lancement: 1500000, coutMensuel: 25000, poids: 2.5, cacX: 2.5, prixX: 1.4, presence: 0.2, langues: 1 },
  { id: "latam", nom: "Amérique latine", actif: false, entreprises: 1200000, seuil: 20000, lancement: 400000, coutMensuel: 8000, poids: 1, cacX: 1, prixX: 0.4, presence: 0.2, langues: 1 },
];
const ENTREPRISES_FRANCE = 440000;

// ------------------------------------------------------------ à la main

export type Role = "aide" | "commercial" | "dev" | "support";
export const ROLES: Record<Role, string> = {
  aide: "Aide polyvalente",
  commercial: "Commercial(e)",
  dev: "Développeur·se",
  support: "Support client",
};

/** Un recrutement décidé à la main (en plus des embauches automatiques). */
export type Recrutement = {
  id: string;
  poste: string;
  role: Role;
  debut: number; // mois depuis novembre 2026
  fin: number | null; // mois de départ, ou null
  net: number; // salaire net mensuel (€ d'aujourd'hui)
  tempsPct: number; // temps de travail (%)
  productivite: number; // clients/mois trouvés (commercial seulement)
};

export type TypePonctuel = "depense" | "recette" | "levee" | "pret" | "choc";
export const TYPES_PONCTUELS: Record<TypePonctuel, string> = {
  depense: "Dépense",
  recette: "Recette exceptionnelle",
  levee: "Levée de fonds",
  pret: "Prêt bancaire",
  choc: "Choc sur l'acquisition",
};

/** Un événement décidé à la main : une grosse dépense, une subvention, une
 *  levée de fonds, un prêt, l'arrivée d'un concurrent… */
export type Ponctuel = {
  id: string;
  libelle: string;
  type: TypePonctuel;
  mois: number; // mois depuis novembre 2026
  montant: number; // € (dépense, recette, levée, prêt)
  repetition: number; // nombre de mois (1 = une fois ; 0 = jusqu'à la fin, pour un choc ou une dépense mensuelle)
  dilution: number; // % de la société cédé (levée)
  taux: number; // taux annuel (prêt)
  duree: number; // durée du remboursement en mois (prêt)
  effet: number; // % sur l'acquisition (choc : −30 = un concurrent, +50 = un passage télé)
};

export type Salaire = { mode: "auto" | "fixe"; net: number; debut: number; hausse: number };

export type Reglages = {
  horizon: number; // années (1 à 15)
  prix: number;
  haussePrix: number; // %/an, appliquée à chaque anniversaire du lancement
  options: number; // € de plus par client et par mois (modules payants)
  prixTesteurs: number; // le tarif fondateur des testeurs de la bêta
  conversionBeta: number; // % des testeurs encore actifs qui passent à l'abonnement
  mois16: number; // mois avant le lancement payant (SASU à 16 ans)
  mois18: number; // mois avant tes 18 ans (plein temps possible)
  capital: number; // ce que tu mets dans la société à sa création (€)
  reinvest: number; // % du bénéfice laissé dans la société
  reserveMois: number; // mois de charges gardés en réserve avant de verser des dividendes
  baisseIA: number; // % de baisse du coût de l'IA par an
  coutIA: number; // € d'IA par client et par mois au départ
  embauches: boolean; // embauches automatiques
  international: boolean; // s'étendre à l'étranger
  pleinTemps: boolean; // plein temps à 18 ans
  salaire: Salaire;
  coefDirigeant: number; // coût pour la société d'un euro net versé au président
  coefEmployeur: number; // coût employeur d'un euro net versé à un salarié
  flatTax: number; // % prélevé sur les dividendes
  inflation: number; // %/an sur les salaires et les frais fixes
  saisonnalite: boolean; // le bâtiment ralentit en août et en décembre
  multAcquisition: number; // × sur tous les nouveaux clients
  multChurn: number; // × sur les départs
  multCac: number; // × sur le coût d'un client en publicité
  marches: Marche[];
  recrutements: Recrutement[];
  ponctuels: Ponctuel[];
  leviers: Record<IdLevier, boolean>;
  ajustements: Partial<Record<IdScenario, Partial<Omit<Scenario, "id" | "label" | "resume">>>>;
};

export const REGLAGES_DEFAUT: Reglages = {
  horizon: 10,
  prix: 29, haussePrix: 0, options: 0, prixTesteurs: 19, conversionBeta: 45,
  mois16: 6, mois18: 30, capital: 1000, reinvest: 30, reserveMois: 3, baisseIA: 10, coutIA: 3,
  embauches: true, international: true, pleinTemps: true,
  salaire: { mode: "auto", net: 1500, debut: 30, hausse: 0 },
  coefDirigeant: 1.8, coefEmployeur: 1.82, flatTax: 30, inflation: 0, saisonnalite: false,
  multAcquisition: 1, multChurn: 1, multCac: 1,
  marches: MARCHES_DEFAUT,
  recrutements: [],
  ponctuels: [],
  // Par défaut : les techniques que chaque scénario suppose déjà. Les
  // fonctionnalités pas encore construites (et le parrainage) sont à
  // allumer pour voir ce qu'elles changeraient.
  leviers: {
    parrainage: false, factureElectronique: false, importDevis: false, rapportChantier: false,
    horsLigne: false, partenariats: true, publicite: true, referencement: true,
  },
  ajustements: {},
};

/** Le scénario avec les ajustements faits dans la page. */
export function scenarioAjuste(sc: Scenario, r: Reglages): Scenario {
  return { ...sc, ...(r.ajustements[sc.id] ?? {}) };
}

const POSTES: Record<Role | "commercialAuto" | "marketing" | "admin", number> = {
  support: 3300, dev: 5100, commercial: 4350, commercialAuto: 4350, marketing: 4350, admin: 3650, aide: 3000,
};
const OUTILS = 150, RECRUTEMENT = 3000, LOCAUX = 450, PRODUCTIVITE_COMMERCIAL = 15;
// La bêta n'est pas un trou de six mois : des artisans s'y inscrivent dès
// le premier mois, plus facilement qu'en payant (BETA_FACILITE).
const BETA_FACILITE = 1.5;
// Le bâtiment, mois par mois (janvier → décembre) : on signe peu en août
// et avant Noël, beaucoup à la rentrée. Moyenne égale à 1.
const SAISON = [1.1, 1.05, 1.15, 1.1, 1.0, 0.95, 0.8, 0.5, 1.3, 1.15, 1.05, 0.75];
const MOY_SAISON = SAISON.reduce((s, x) => s + x, 0) / 12;

export const DEBUT = Date.UTC(2026, 10, 1); // 1er novembre 2026
export const HORIZON_MAX = 15;
/** Nombre de jours simulés pour un horizon en années. */
export function nbJoursPour(horizon: number) {
  const h = Math.max(1, Math.min(HORIZON_MAX, Math.round(horizon)));
  return Math.round((Date.UTC(2026 + h, 10, 1) - DEBUT) / 86400000);
}
const JOUR = 12 / 365; // part d'un mois dans une journée

export type Canaux = { bao: number; demarchage: number; internet: number; pub: number };
export type Charges = { toi: number; equipe: number; pub: number; ia: number; international: number; reste: number; ponctuel: number };

export type Etape = {
  jour: number;
  texte: string;
  type: "lancement" | "embauche" | "international" | "age" | "rentable" | "ponctuel" | "alerte";
};

export type Periode = {
  n: number; debut: number; fin: number;
  ca: number; charges: Charges; totalCharges: number; resultat: number; is: number;
  salaireNet: number; dividendesNets: number; poche: number; reinvesti: number;
  clientsFin: number; etrangerFin: number; effectifFin: number; nouveaux: Canaux; departs: number;
  tresorerieFin: number; apports: number;
};

export type Projection = {
  nbJours: number;
  // Séries quotidiennes (longueur nbJours).
  clients: Float64Array; etranger: Float64Array; ca: Float64Array; charges: Float64Array; resultat: Float64Array;
  caCumul: Float64Array; resultatCumul: Float64Array; pocheCumul: Float64Array; tresorerie: Float64Array;
  effectif: Uint16Array; nouveaux: { bao: Float64Array; demarchage: Float64Array; internet: Float64Array; pub: Float64Array };
  parMarche: Record<string, Float64Array>;
  marchesLances: string[];
  annees: Periode[]; mois: Periode[]; evenements: Etape[];
  premierJourRentable: number | null; avance: number; totalPoche: number;
  tresorerieMin: number; jourTresorerieMin: number; premierJourNegatif: number | null;
  partFinale: number; // ta part de la société à la fin (après les levées)
  cacMoyen: number | null; // € dépensés en publicité par client venu de la publicité
  ltv: number; // ce que rapporte un client sur sa durée de vie (marge brute)
  arrFin: number; // chiffre d'affaires annuel récurrent à la fin
};

function lissage(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
function palier(v: number, paliers: [number, number][]) {
  for (const [seuil, valeur] of paliers) if (v < seuil) return valeur;
  return paliers[paliers.length - 1][1];
}
function impotSocietes(b: number) {
  return b <= 0 ? 0 : 0.15 * Math.min(b, 42500) + 0.25 * Math.max(0, b - 42500);
}
const chargesVides = (): Charges => ({ toi: 0, equipe: 0, pub: 0, ia: 0, international: 0, reste: 0, ponctuel: 0 });
const canauxVides = (): Canaux => ({ bao: 0, demarchage: 0, internet: 0, pub: 0 });
const periodeVide = (n: number, d: number): Periode => ({
  n, debut: d, fin: d, ca: 0, charges: chargesVides(), totalCharges: 0, resultat: 0, is: 0,
  salaireNet: 0, dividendesNets: 0, poche: 0, reinvesti: 0, clientsFin: 0, etrangerFin: 0, effectifFin: 0,
  nouveaux: canauxVides(), departs: 0, tresorerieFin: 0, apports: 0,
});

/** Date (UTC) du jour d. */
export function dateDuJour(d: number) {
  return new Date(DEBUT + d * 86400000);
}
/** Mois écoulés depuis novembre 2026 au jour d. */
export function moisDuJour(d: number) {
  const dt = dateDuJour(d);
  return (dt.getUTCFullYear() - 2026) * 12 + dt.getUTCMonth() - 10;
}
/** Le premier jour du mois m (depuis novembre 2026). */
export function jourDuMois(m: number) {
  return Math.round((Date.UTC(2026, 10 + m, 1) - DEBUT) / 86400000);
}
/** « nov. 2027 » pour le mois m. */
export function libelleMois(m: number) {
  return new Date(Date.UTC(2026, 10 + m, 1)).toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Le calendrier d'un horizon, calculé une fois : mois, jour du mois,
 *  mois de l'année. Évite trois dates par jour simulé. */
type Calendrier = { mois: Int16Array; premier: Uint8Array; fin: Uint8Array; moisAnnee: Uint8Array };
const calendriers = new Map<number, Calendrier>();
function calendrier(N: number): Calendrier {
  const deja = calendriers.get(N);
  if (deja) return deja;
  const c: Calendrier = { mois: new Int16Array(N), premier: new Uint8Array(N), fin: new Uint8Array(N), moisAnnee: new Uint8Array(N) };
  for (let d = 0; d < N; d++) {
    const dt = dateDuJour(d);
    c.mois[d] = moisDuJour(d);
    c.premier[d] = dt.getUTCDate() === 1 ? 1 : 0;
    c.fin[d] = dateDuJour(d + 1).getUTCDate() === 1 ? 1 : 0;
    c.moisAnnee[d] = dt.getUTCMonth();
  }
  calendriers.set(N, c);
  return c;
}
const SEUILS_DEV = [900, 2500, 5000, 8000, 12000, 16000, 20000, 30000, 45000, 60000];
const SEUILS_MARKETING = [2000, 8000, 20000, 50000];
const SEUILS_ADMIN = [15, 30, 50, 80];
function compter(seuils: number[], v: number) {
  let n = 0;
  for (const s of seuils) if (v >= s) n++;
  return n;
}
const CLES_CHARGES: (keyof Charges)[] = ["toi", "equipe", "pub", "ia", "international", "reste", "ponctuel"];

/** Mensualité d'un prêt (amortissement constant). */
function mensualite(montant: number, tauxAn: number, duree: number) {
  const n = Math.max(1, duree), t = tauxAn / 100 / 12;
  return t === 0 ? montant / n : (montant * t) / (1 - Math.pow(1 + t, -n));
}

export function projeter(scBrut: Scenario, r: Reglages): Projection {
  const sc = scenarioAjuste(scBrut, r);
  const N = nbJoursPour(r.horizon), L = r.mois16, M18 = r.mois18, lv = r.leviers;
  const facteurChurn = (lv.factureElectronique ? 0.85 : 1) * (lv.importDevis ? 0.9 : 1) * (lv.horsLigne ? 0.95 : 1) * r.multChurn;
  const facteurBao = (lv.parrainage ? 1.35 : 1) * (lv.rapportChantier ? 1.2 : 1);
  const partFrance = sc.capFrance / ENTREPRISES_FRANCE;
  const conversion = r.conversionBeta / 100;
  const marches = r.marches.filter((mk) => mk.id === "fr" || (r.international && mk.actif));

  const p: Projection = {
    nbJours: N,
    clients: new Float64Array(N), etranger: new Float64Array(N), ca: new Float64Array(N), charges: new Float64Array(N),
    resultat: new Float64Array(N), caCumul: new Float64Array(N), resultatCumul: new Float64Array(N),
    pocheCumul: new Float64Array(N), tresorerie: new Float64Array(N), effectif: new Uint16Array(N),
    nouveaux: { bao: new Float64Array(N), demarchage: new Float64Array(N), internet: new Float64Array(N), pub: new Float64Array(N) },
    parMarche: Object.fromEntries(marches.map((mk) => [mk.id, new Float64Array(N)])),
    marchesLances: [],
    annees: [], mois: [], evenements: [], premierJourRentable: null, avance: 0, totalPoche: 0,
    tresorerieMin: 0, jourTresorerieMin: 0, premierJourNegatif: null, partFinale: 1,
    cacMoyen: null, ltv: 0, arrFin: 0,
  };

  const clients: Record<string, number> = Object.fromEntries(marches.map((mk) => [mk.id, 0]));
  const lanceLe: Record<string, number | null> = Object.fromEntries(marches.map((mk) => [mk.id, null]));
  let fondateurs = 0, beta = 0, tresorerie = 0, poche = 0, caCumul = 0, resCumul = 0, effectifAvant = 0;
  let annee: Periode | null = null, moisP: Periode | null = null;
  let salaireMois = 0, moisCourant = -1, resultatMois = 0, rentableNote = false;
  let part = 1, pubTotal = 0, clientsPub = 0, alerteNotee = false;
  let ponctuelMoisCharge = 0, ponctuelMoisRecette = 0, choc = 1;
  const prets: { reste: number; mensualite: number; taux: number }[] = [];
  const recrutesVus = new Set<string>();

  const cal = calendrier(N);
  // Les marchés lancés, tenus à jour à chaque lancement (pas recalculés
  // chaque jour).
  let actifs: Marche[] = [];
  let lances: Marche[] = [];
  let poidsTotal = 0, langues = 0, coutMensuelEtranger = 0;
  const majLances = () => {
    actifs = marches.filter((mk) => lanceLe[mk.id] !== null);
    lances = actifs.filter((mk) => mk.id !== "fr");
    poidsTotal = actifs.reduce((s, mk) => s + mk.poids, 0);
    langues = lances.reduce((s, mk) => s + mk.langues, 0);
    coutMensuelEtranger = lances.reduce((s, mk) => s + mk.coutMensuel, 0);
  };
  const somme = () => {
    let t = 0;
    for (const mk of marches) t += clients[mk.id];
    return t;
  };
  const etranger = () => {
    let t = 0;
    for (const mk of lances) t += clients[mk.id];
    return t;
  };

  for (let d = 0; d < N; d++) {
    const m = cal.mois[d];
    const premierDuMois = cal.premier[d] === 1;
    const finDeMois = cal.fin[d] === 1;
    const lance = m >= L;
    const inflation = Math.pow(1 + r.inflation / 100, m / 12);

    // Nouvel exercice (12 mois depuis novembre) et nouveau mois.
    if (m % 12 === 0 && premierDuMois) {
      annee = periodeVide(m / 12 + 1, d);
      p.annees.push(annee);
    }
    if (premierDuMois) {
      moisP = periodeVide(m + 1, d);
      p.mois.push(moisP);
    }
    const a = annee!, mo = moisP!;

    let apportJour = 0; // levées et prêts : de l'argent qui entre sans être un chiffre d'affaires
    let remboursementJour = 0; // le capital d'un prêt qu'on rend
    if (m !== moisCourant) {
      moisCourant = m;
      resultatMois = 0;
      if (m === L) {
        lanceLe.fr = d;
        majLances();
        apportJour += r.capital;
        fondateurs = beta * conversion;
        p.evenements.push({ jour: d, type: "lancement", texte: `Création de la SASU : ${Math.round(fondateurs)} testeurs de la bêta passent à l'abonnement` });
      }
      if (m === M18 && r.pleinTemps) p.evenements.push({ jour: d, type: "age", texte: "Tes 18 ans : à plein temps" });

      // Les événements décidés à la main, appliqués le premier jour du mois.
      ponctuelMoisCharge = 0;
      ponctuelMoisRecette = 0;
      choc = 1;
      for (const e of r.ponctuels) {
        const dure = e.repetition <= 0 ? Infinity : e.repetition;
        const actif = m >= e.mois && m < e.mois + dure;
        if (e.type === "choc" && actif) choc *= Math.max(0, 1 + e.effet / 100);
        if (e.type === "depense" && actif) ponctuelMoisCharge += e.montant;
        if (e.type === "recette" && actif) ponctuelMoisRecette += e.montant;
        if (m !== e.mois) continue;
        const libelle = e.libelle || TYPES_PONCTUELS[e.type];
        if (e.type === "levee") {
          apportJour += e.montant;
          part *= 1 - Math.min(100, Math.max(0, e.dilution)) / 100;
          p.evenements.push({ jour: d, type: "ponctuel", texte: `${libelle} : +${Math.round(e.montant).toLocaleString("fr-FR")} €, ${e.dilution} % cédés` });
        } else if (e.type === "pret") {
          apportJour += e.montant;
          prets.push({ reste: e.montant, mensualite: mensualite(e.montant, e.taux, e.duree), taux: e.taux / 100 / 12 });
          p.evenements.push({ jour: d, type: "ponctuel", texte: `${libelle} : +${Math.round(e.montant).toLocaleString("fr-FR")} € sur ${e.duree} mois` });
        } else {
          const signe = e.type === "depense" ? "−" : e.type === "recette" ? "+" : e.effet >= 0 ? "+" : "−";
          const valeur = e.type === "choc" ? `${Math.abs(e.effet)} % de nouveaux clients` : `${Math.round(e.montant).toLocaleString("fr-FR")} €${e.repetition !== 1 ? "/mois" : ""}`;
          p.evenements.push({ jour: d, type: "ponctuel", texte: `${libelle} : ${signe}${valeur}` });
        }
      }
    }

    const total = somme() + fondateurs;

    // Étranger : seuil atteint ET de quoi payer le lancement et six mois.
    let coutLancement = 0;
    if (lance && r.international) {
      for (const mk of marches) {
        if (mk.id === "fr" || lanceLe[mk.id] !== null) continue;
        // La caisse paie les lancements du jour l'un après l'autre : deux
        // marchés ne s'ouvrent pas avec le même argent.
        if (total >= mk.seuil && tresorerie - coutLancement >= mk.lancement * 1.5) {
          lanceLe[mk.id] = d;
          majLances();
          coutLancement += mk.lancement;
          p.marchesLances.push(mk.id);
          p.evenements.push({ jour: d, type: "international", texte: `Lancement : ${mk.nom}` });
        }
      }
    }

    // Équipe automatique.
    let support = 0, dev = 0, commercial = 0, marketing = 0, admin = 0;
    if (lance && r.embauches) {
      support = (total >= 350 ? 1 + Math.floor((total - 350) / 800) : 0) + lances.length;
      dev = compter(SEUILS_DEV, total) + langues;
      commercial = compter(sc.commerciaux, total);
      marketing = compter(SEUILS_MARKETING, total);
    }
    // Recrutements à la main (une fois la société créée).
    let coutRecrutes = 0, commerciauxRecrutes = 0, recrutes = 0;
    if (lance) {
      for (const h of r.recrutements) {
        if (m < h.debut || (h.fin !== null && m >= h.fin)) continue;
        recrutes++;
        const temps = Math.max(0, h.tempsPct) / 100;
        coutRecrutes += h.net * temps * r.coefEmployeur * inflation + OUTILS;
        if (h.role === "commercial") commerciauxRecrutes += h.productivite * temps;
        if (!recrutesVus.has(h.id)) {
          recrutesVus.add(h.id);
          p.evenements.push({ jour: d, type: "embauche", texte: `Arrivée : ${h.poste || ROLES[h.role]}` });
        }
      }
    }
    if (r.embauches) admin = compter(SEUILS_ADMIN, support + dev + commercial + marketing + recrutes);
    const effectif = support + dev + commercial + marketing + admin + recrutes;
    const embauches = Math.max(0, effectif - effectifAvant);
    if (embauches > 0 && effectifAvant === 0 && recrutes < effectif) p.evenements.push({ jour: d, type: "embauche", texte: "Première embauche automatique" });
    else if (embauches > 0 && [5, 10, 20, 30, 40, 50, 75, 100].some((s) => effectifAvant < s && effectif >= s)) {
      p.evenements.push({ jour: d, type: "embauche", texte: `L'équipe passe à ${effectif} personnes` });
    }
    effectifAvant = effectif;

    // Acquisition, par marché et par canal (taux mensuels ramenés au jour).
    const saison = r.saisonnalite ? SAISON[cal.moisAnnee[d]] / MOY_SAISON : 1;
    const multiplicateur = r.multAcquisition * choc * saison;
    const churnMois = Math.min(0.9, ((sc.churnDebut + (sc.churnFin - sc.churnDebut) * lissage((m - L) / 48)) / 100) * facteurChurn);
    const churnJour = 1 - Math.pow(1 - churnMois, JOUR);
    const canaux = canauxVides();
    const nouveaux: Record<string, number> = {};
    let pubDepense = 0, partenairesNouveaux = 0, departsJour = 0, pubClientsJour = 0;
    const prixBase = r.prix * Math.pow(1 + r.haussePrix / 100, Math.max(0, Math.floor((m - L) / 12))) + r.options;
    if (lance) {
      for (const mk of actifs) {
        const depuis = (d - (lanceLe[mk.id] as number)) / 30.44;
        const base = clients[mk.id] + (mk.id === "fr" ? fondateurs : 0);
        // Le plafond : la part de marché que le scénario peut tenir. Plus on
        // s'en approche, plus chaque nouveau client coûte d'efforts — c'est
        // ce qui fait plafonner les dernières années. À l'étranger, sans
        // présence sur place, la part tenable est plus petite (presence).
        const cap = Math.max(1, mk.entreprises * partFrance * (mk.id === "fr" ? 1 : mk.presence));
        const place = Math.pow(Math.max(0, 1 - base / cap), 2);
        const caMk = clients[mk.id] * prixBase * mk.prixX + (mk.id === "fr" ? fondateurs * r.prixTesteurs : 0);
        const elan = 1 + lissage((total - 20) / 130); // Axel se donne à fond dès que ça marche
        // L'effet boule de neige : avis Google, artisans du coin qui
        // l'utilisent déjà, références à citer (jusqu'à +60 % vers 500).
        const preuve = 1 + 0.6 * lissage(total / 500);
        const bao = (sc.bao / 100) * facteurBao * base;
        const toi = mk.id === "fr" ? (m >= M18 && r.pleinTemps ? sc.fondPlein : sc.fondEtud) * elan * preuve : 0;
        const social = mk.id === "fr" ? sc.social * lissage((m + 3) / 9) : sc.social * 0.3 * mk.poids * lissage(depuis / 12);
        const internet = (sc.seoMax * (lv.referencement ? 1 : 0.5) * mk.poids * lissage(depuis / 36) * (1 + 0.5 * lissage(total / 1500)) + social) * preuve;
        let budget = lv.publicite && m - L >= sc.pubDes ? Math.max((sc.pubPct / 100) * caMk, mk.id === "fr" ? sc.pubMin : 0) : 0;
        if (mk.id !== "fr" && depuis < 12) budget += (mk.lancement * 0.25) / 12; // campagne de lancement
        const cac = sc.cac * mk.cacX * r.multCac * Math.sqrt(1 + budget / 15000);
        const pub = budget > 0 ? (budget / cac) * preuve : 0;
        pubDepense += budget;
        const partenaires = lv.partenariats && mk.id === "fr" && m - L >= sc.partenairesDes ? sc.partenaires : 0;
        const comm = (commercial * PRODUCTIVITE_COMMERCIAL + commerciauxRecrutes) * (mk.poids / poidsTotal);
        const f = place * JOUR * multiplicateur;
        const n = { bao: bao * f, demarchage: (toi + partenaires + comm) * f, internet: internet * f, pub: pub * f };
        partenairesNouveaux += partenaires * f;
        pubClientsJour += n.pub;
        canaux.bao += n.bao; canaux.demarchage += n.demarchage; canaux.internet += n.internet; canaux.pub += n.pub;
        nouveaux[mk.id] = n.bao + n.demarchage + n.internet + n.pub;
      }
      for (const mk of marches) {
        departsJour += clients[mk.id] * churnJour;
        clients[mk.id] = clients[mk.id] * (1 - churnJour) + (nouveaux[mk.id] ?? 0);
      }
      departsJour += fondateurs * churnJour;
      fondateurs *= 1 - churnJour;
    } else {
      // La bêta, gratuite : on s'inscrit plus facilement, on part aussi
      // plus facilement (rien n'est payé), Google commence à peine.
      const elan = 1 + lissage((beta - 20) / 130);
      const n = {
        bao: (sc.bao / 100) * facteurBao * beta,
        demarchage: sc.fondEtud * elan * BETA_FACILITE,
        internet: sc.seoMax * (lv.referencement ? 1 : 0.5) * 0.3 * lissage(m / 12) + sc.social * lissage((m + 3) / 9) * BETA_FACILITE,
      };
      const f = JOUR * multiplicateur;
      canaux.bao += n.bao * f;
      canaux.demarchage += n.demarchage * f;
      canaux.internet += n.internet * f;
      const departBeta = 1 - Math.pow(1 - Math.min(0.9, (sc.churnDebut * 1.5 * r.multChurn) / 100), JOUR);
      departsJour += beta * departBeta;
      beta = beta * (1 - departBeta) + (n.bao + n.demarchage + n.internet) * f;
    }
    pubTotal += pubDepense * JOUR;
    clientsPub += pubClientsJour;

    const payants = lance ? somme() + fondateurs : 0;
    let caJourAbos = 0;
    if (lance) {
      for (const mk of marches) caJourAbos += clients[mk.id] * prixBase * mk.prixX;
      caJourAbos += fondateurs * r.prixTesteurs;
      caJourAbos *= JOUR;
    }
    const recetteJour = premierDuMois ? ponctuelMoisRecette : 0;
    const caJour = caJourAbos + recetteJour;
    const caAn = caJourAbos * 365;

    // Charges du jour.
    const ch = chargesVides();
    if (!lance) {
      ch.ia = (beta * 2 + 25) * JOUR;
    } else {
      const coutIA = r.coutIA * Math.pow(1 - r.baisseIA / 100, (m - L) / 12);
      const parClient = coutIA + 0.015 * prixBase + 0.25 + 0.5 + 0.3 + (lv.factureElectronique ? 0.4 : 0);
      ch.ia = (payants * parClient + palier(payants, [[500, 25], [2000, 250], [10000, 900], [50000, 2500], [Infinity, 6000]])) * JOUR;
      const effectifAuto = support + dev + commercial + marketing + admin;
      ch.equipe =
        ((support * POSTES.support + dev * POSTES.dev + commercial * POSTES.commercialAuto + marketing * POSTES.marketing +
          admin * POSTES.admin + effectifAuto * OUTILS + (effectif >= 5 ? effectif * LOCAUX : 0)) * inflation + coutRecrutes) * JOUR +
        embauches * RECRUTEMENT;
      const filleuls = lv.parrainage ? canaux.bao : 0;
      ch.pub = pubDepense * JOUR + filleuls * prixBase + partenairesNouveaux * 60 + palier(payants, [[500, 0], [3000, 700], [Infinity, 2500]]) * JOUR;
      ch.reste =
        (palier(caAn, [[100000, 80], [500000, 150], [2000000, 400], [10000000, 1000], [Infinity, 3000]]) + 40 * effectif +
          palier(payants, [[1000, 40], [5000, 250], [50000, 700], [Infinity, 2000]]) + (payants >= 2000 ? 400 : 40) +
          palier(payants, [[1000, 10], [Infinity, 50]]) + (m - L >= 12 ? 25 : 0) + 23) * JOUR * inflation +
        0.01 * caJourAbos + (d === lanceLe.fr ? 225 : 0);
      ch.international = coutLancement + coutMensuelEtranger * inflation * JOUR;
      // Ton salaire, fixé chaque début de mois.
      if (premierDuMois) {
        if (r.salaire.mode === "fixe") {
          salaireMois = m >= r.salaire.debut ? r.salaire.net * Math.pow(1 + r.salaire.hausse / 100, Math.floor((m - r.salaire.debut) / 12)) : 0;
        } else {
          // Selon ce que la société peut payer : rien tant que la caisse ne
          // couvre pas trois mois de ce salaire.
          const vise = r.pleinTemps && m >= M18 ? palier(caAn, [[60000, 0], [150000, 1500], [500000, 2500], [2000000, 4000], [10000000, 6000], [Infinity, 9000]]) : 0;
          salaireMois = tresorerie > vise * r.coefDirigeant * 3 ? vise : 0;
        }
      }
      ch.toi = salaireMois * r.coefDirigeant * JOUR; // charges d'un président de SASU comprises
    }
    // Dépenses ponctuelles et intérêts des prêts, le premier jour du mois.
    if (premierDuMois) {
      ch.ponctuel += ponctuelMoisCharge;
      for (const pr of prets) {
        if (pr.reste <= 0.01) continue;
        const interets = pr.reste * pr.taux;
        const capital = Math.min(pr.reste, pr.mensualite - interets);
        ch.ponctuel += interets;
        remboursementJour += capital;
        pr.reste -= capital;
      }
    }
    const chargesJour = ch.toi + ch.equipe + ch.pub + ch.ia + ch.international + ch.reste + ch.ponctuel;
    const resultatJour = caJour - chargesJour;
    // Avant la création de la société, c'est toi qui avances les frais :
    // ils ne passent pas par sa trésorerie.
    if (!lance) p.avance += chargesJour;
    else tresorerie += resultatJour;
    tresorerie += apportJour - remboursementJour;
    resultatMois += resultatJour;

    // Salaire versé en fin de mois.
    if (finDeMois && salaireMois > 0) {
      poche += salaireMois;
      a.salaireNet += salaireMois;
      mo.salaireNet += salaireMois;
    }
    if (finDeMois && lance && !rentableNote && resultatMois > 0 && ponctuelMoisRecette === 0) {
      rentableNote = true;
      p.premierJourRentable = d;
      p.evenements.push({ jour: d, type: "rentable", texte: `Premier mois rentable (${Math.round(payants)} clients)` });
    }

    const enEtranger = etranger();
    for (const per of [a, mo]) {
      per.ca += caJour;
      per.totalCharges += chargesJour;
      per.resultat += resultatJour;
      per.departs += departsJour;
      per.apports += apportJour - remboursementJour;
      for (const k of CLES_CHARGES) per.charges[k] += ch[k];
      per.nouveaux.bao += canaux.bao;
      per.nouveaux.demarchage += canaux.demarchage;
      per.nouveaux.internet += canaux.internet;
      per.nouveaux.pub += canaux.pub;
      per.clientsFin = lance ? payants : beta;
      per.etrangerFin = enEtranger;
      per.effectifFin = effectif;
      per.fin = d;
    }

    // Fin d'exercice : impôt, réserve, part réinvestie, dividendes (ta part).
    if (m % 12 === 11 && finDeMois) {
      a.is = impotSocietes(a.resultat);
      mo.is += a.is;
      tresorerie -= a.is;
      const distribuable = Math.max(0, tresorerie - (r.reserveMois * a.totalCharges) / 12);
      a.reinvesti = (distribuable * r.reinvest) / 100;
      const verse = distribuable - a.reinvesti;
      const pourToi = verse * part * (1 - r.flatTax / 100);
      a.dividendesNets = pourToi;
      mo.dividendesNets += pourToi;
      tresorerie -= verse;
      poche += pourToi;
    }
    if (finDeMois) {
      a.poche = a.salaireNet + a.dividendesNets;
      mo.poche = mo.salaireNet + mo.dividendesNets;
      a.tresorerieFin = tresorerie;
      mo.tresorerieFin = tresorerie;
    }

    if (lance && tresorerie < p.tresorerieMin) {
      p.tresorerieMin = tresorerie;
      p.jourTresorerieMin = d;
    }
    if (lance && tresorerie < 0 && p.premierJourNegatif === null) {
      p.premierJourNegatif = d;
      if (!alerteNotee) {
        alerteNotee = true;
        p.evenements.push({ jour: d, type: "alerte", texte: "La société n'a plus d'argent" });
      }
    }

    caCumul += caJour;
    resCumul += resultatJour;
    p.clients[d] = lance ? payants : beta;
    p.etranger[d] = enEtranger;
    for (const mk of marches) p.parMarche[mk.id][d] = clients[mk.id] + (mk.id === "fr" ? fondateurs : 0);
    if (!lance) p.parMarche.fr[d] = beta;
    p.ca[d] = caJour;
    p.charges[d] = chargesJour;
    p.resultat[d] = resultatJour;
    p.caCumul[d] = caCumul;
    p.resultatCumul[d] = resCumul;
    p.pocheCumul[d] = poche;
    p.tresorerie[d] = tresorerie;
    p.effectif[d] = effectif;
    p.nouveaux.bao[d] = canaux.bao;
    p.nouveaux.demarchage[d] = canaux.demarchage;
    p.nouveaux.internet[d] = canaux.internet;
    p.nouveaux.pub[d] = canaux.pub;

    if (d === N - 1) {
      p.arrFin = caAn;
      const marge = Math.max(0, prixBase - (r.coutIA * Math.pow(1 - r.baisseIA / 100, Math.max(0, m - L) / 12) + 0.015 * prixBase + 1.05));
      p.ltv = churnMois > 0 ? marge / churnMois : 0;
    }
  }
  p.totalPoche = poche;
  p.partFinale = part;
  p.cacMoyen = clientsPub > 1 ? pubTotal / clientsPub : null;
  p.evenements.sort((x, y) => x.jour - y.jour);
  return p;
}

/** Ce que rapporte chaque levier : la même projection avec et sans lui. */
export function apportDesLeviers(sc: Scenario, r: Reglages) {
  return LEVIERS.map((l) => {
    const avec = projeter(sc, { ...r, leviers: { ...r.leviers, [l.id]: true } });
    const sans = projeter(sc, { ...r, leviers: { ...r.leviers, [l.id]: false } });
    const fin = avec.nbJours - 1;
    return { levier: l, actif: r.leviers[l.id], poche: avec.totalPoche - sans.totalPoche, clients: avec.clients[fin] - sans.clients[fin] };
  }).sort((x, y) => y.poche - x.poche);
}

/** Relit des réglages enregistrés (ancienne version comprise) sans jamais
 *  casser : tout champ absent reprend sa valeur par défaut. */
export function relireReglages(brut: unknown): Reglages {
  const x = (brut && typeof brut === "object" ? brut : {}) as Partial<Reglages>;
  const marches = Array.isArray(x.marches)
    ? MARCHES_DEFAUT.map((def) => ({ ...def, ...(x.marches as Marche[]).find((mk) => mk?.id === def.id) })).concat(
        (x.marches as Marche[]).filter((mk) => mk?.id && !MARCHES_DEFAUT.some((def) => def.id === mk.id))
      )
    : MARCHES_DEFAUT;
  return {
    ...REGLAGES_DEFAUT,
    ...x,
    salaire: { ...REGLAGES_DEFAUT.salaire, ...(x.salaire ?? {}) },
    leviers: { ...REGLAGES_DEFAUT.leviers, ...(x.leviers ?? {}) },
    marches,
    recrutements: Array.isArray(x.recrutements) ? x.recrutements : [],
    ponctuels: Array.isArray(x.ponctuels) ? x.ponctuels : [],
    ajustements: x.ajustements && typeof x.ajustements === "object" ? x.ajustements : {},
    mois18: typeof x.mois18 === "number" ? x.mois18 : (typeof x.mois16 === "number" ? x.mois16 : REGLAGES_DEFAUT.mois16) + 24,
  };
}
