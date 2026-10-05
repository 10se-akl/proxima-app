// ============================================================
// Projection de Compyo sur 10 ans, JOUR PAR JOUR (05/10).
//
// Page /admin/projection, réservée à Axel. Ce n'est pas une prédiction :
// chaque nombre ci-dessous est une hypothèse réglable, écrite en clair
// dans la page. Le calcul est pur (aucune base, aucun réseau) : il tourne
// dans le navigateur à chaque réglage.
//
// D'où viennent les clients : bouche-à-oreille, démarchage d'Axel (qui
// double dès que les premiers clients restent — « je ne lâche rien »),
// Google, publicité, partenaires, commerciaux. Où va l'argent : IA et
// hébergement, équipe, publicité, international, le reste (comptable,
// assurances, juridique…), le salaire d'Axel à partir de ses 18 ans.
// Ce qui arrive dans sa poche : salaire net chaque fin de mois, dividendes
// nets chaque fin d'exercice.
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
  pubDes: number;
  cac: number; // coût d'un client en publicité au départ (€)
  churnDebut: number; // % de clients qui partent chaque mois au début
  churnFin: number; // … une fois le produit mûr (4 ans)
  commerciaux: number[]; // seuils de clients pour embaucher chaque commercial
  // 05/10 — ce qui fait décoller (ou non) dès le début, et où ça plafonne.
  social: number; // clients/mois venus de TikTok, Instagram, Facebook (vidéos, pub motion), après 9 mois
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

export type Reglages = {
  prix: number;
  mois16: number; // mois avant le lancement payant (SASU à 16 ans)
  reinvest: number; // % du bénéfice laissé dans la société
  baisseIA: number; // % de baisse du coût de l'IA par an
  embauches: boolean;
  international: boolean;
  pleinTemps: boolean;
  leviers: Record<IdLevier, boolean>;
};

export const REGLAGES_DEFAUT: Reglages = {
  prix: 29, mois16: 6, reinvest: 30, baisseIA: 10, embauches: true, international: true, pleinTemps: true,
  // Par défaut : les techniques que chaque scénario suppose déjà. Les
  // fonctionnalités pas encore construites (et le parrainage) sont à
  // allumer pour voir ce qu'elles changeraient.
  leviers: {
    parrainage: false, factureElectronique: false, importDevis: false, rapportChantier: false,
    horsLigne: false, partenariats: true, publicite: true, referencement: true,
  },
};

type IdMarche = "fr" | "franco" | "sud";
const MARCHES: { id: IdMarche; nom: string; cap: number; lancement: number; seuil: number; poids: number; cacX: number }[] = [
  { id: "fr", nom: "France", cap: 44000, lancement: 0, seuil: 0, poids: 1, cacX: 1 },
  { id: "franco", nom: "Belgique, Suisse, Luxembourg", cap: 8000, lancement: 25000, seuil: 1500, poids: 0.25, cacX: 1.3 },
  { id: "sud", nom: "Espagne et Italie", cap: 50000, lancement: 120000, seuil: 5000, poids: 1.2, cacX: 1.4 },
];
const POSTES = { support: 3300, dev: 5100, commercial: 4350, marketing: 4350, admin: 3650 };
const OUTILS = 150, RECRUTEMENT = 3000, LOCAUX = 450, PRODUCTIVITE_COMMERCIAL = 15;
// 05/10 (Axel : « après la bêta je pense déjà avoir des clients ») : la
// bêta n'est plus un trou de six mois. Des artisans s'y inscrivent dès le
// premier mois (démarchage, bouche-à-oreille, un peu de Google), plus
// facilement qu'en payant (BETA_FACILITE), et au lancement payant une
// part d'entre eux passe à l'abonnement au tarif fondateur (CONVERSION_BETA).
const BETA_FACILITE = 1.5, CONVERSION_BETA = 0.45, PRIX_TESTEURS = 19, RESERVE_MOIS = 3;
export const DEBUT = Date.UTC(2026, 10, 1); // 1er novembre 2026
export const NB_JOURS = Math.round((Date.UTC(2036, 10, 1) - DEBUT) / 86400000); // jusqu'au 31 octobre 2036
const JOUR = 12 / 365; // part d'un mois dans une journée

export type Canaux = { bao: number; demarchage: number; internet: number; pub: number };
export type Charges = { toi: number; equipe: number; pub: number; ia: number; international: number; reste: number };

export type Evenement = { jour: number; texte: string; type: "lancement" | "embauche" | "international" | "age" | "rentable" };

export type Annee = {
  n: number; debut: number; fin: number;
  ca: number; charges: Charges; totalCharges: number; resultat: number; is: number;
  salaireNet: number; dividendesNets: number; poche: number; reinvesti: number;
  clientsFin: number; etrangerFin: number; effectifFin: number; nouveaux: Canaux;
};

export type Projection = {
  // Séries quotidiennes (longueur NB_JOURS).
  clients: Float64Array; etranger: Float64Array; ca: Float64Array; charges: Float64Array; resultat: Float64Array;
  caCumul: Float64Array; resultatCumul: Float64Array; pocheCumul: Float64Array; tresorerie: Float64Array;
  effectif: Uint16Array; nouveaux: { bao: Float64Array; demarchage: Float64Array; internet: Float64Array; pub: Float64Array };
  annees: Annee[]; evenements: Evenement[];
  premierJourRentable: number | null; avance: number; totalPoche: number;
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
const chargesVides = (): Charges => ({ toi: 0, equipe: 0, pub: 0, ia: 0, international: 0, reste: 0 });
const canauxVides = (): Canaux => ({ bao: 0, demarchage: 0, internet: 0, pub: 0 });

/** Date (UTC) du jour d. */
export function dateDuJour(d: number) {
  return new Date(DEBUT + d * 86400000);
}
/** Mois écoulés depuis novembre 2026 au jour d. */
function moisDuJour(d: number) {
  const dt = dateDuJour(d);
  return (dt.getUTCFullYear() - 2026) * 12 + dt.getUTCMonth() - 10;
}

export function projeter(sc: Scenario, r: Reglages): Projection {
  const N = NB_JOURS, L = r.mois16, M18 = L + 24, lv = r.leviers;
  const facteurChurn = (lv.factureElectronique ? 0.85 : 1) * (lv.importDevis ? 0.9 : 1) * (lv.horsLigne ? 0.95 : 1);
  const facteurBao = (lv.parrainage ? 1.35 : 1) * (lv.rapportChantier ? 1.2 : 1);

  const p: Projection = {
    clients: new Float64Array(N), etranger: new Float64Array(N), ca: new Float64Array(N), charges: new Float64Array(N),
    resultat: new Float64Array(N), caCumul: new Float64Array(N), resultatCumul: new Float64Array(N),
    pocheCumul: new Float64Array(N), tresorerie: new Float64Array(N), effectif: new Uint16Array(N),
    nouveaux: { bao: new Float64Array(N), demarchage: new Float64Array(N), internet: new Float64Array(N), pub: new Float64Array(N) },
    annees: [], evenements: [], premierJourRentable: null, avance: 0, totalPoche: 0,
  };

  const clients: Record<IdMarche, number> = { fr: 0, franco: 0, sud: 0 };
  const lanceLe: Record<IdMarche, number | null> = { fr: null, franco: null, sud: null };
  let fondateurs = 0, beta = 0, tresorerie = 0, poche = 0, caCumul = 0, resCumul = 0, effectifAvant = 0;
  let annee: Annee | null = null, salaireMois = 0, moisCourant = -1, resultatMois = 0, rentableNote = false;

  for (let d = 0; d < N; d++) {
    const m = moisDuJour(d);
    const dt = dateDuJour(d);
    const demain = dateDuJour(d + 1);
    const finDeMois = demain.getUTCDate() === 1;
    const lance = m >= L;

    // Nouvel exercice (12 mois depuis novembre).
    if (m % 12 === 0 && dt.getUTCDate() === 1) {
      annee = {
        n: m / 12 + 1, debut: d, fin: d, ca: 0, charges: chargesVides(), totalCharges: 0, resultat: 0, is: 0,
        salaireNet: 0, dividendesNets: 0, poche: 0, reinvesti: 0, clientsFin: 0, etrangerFin: 0, effectifFin: 0, nouveaux: canauxVides(),
      };
      p.annees.push(annee);
    }
    const a = annee!;

    if (m !== moisCourant) {
      moisCourant = m;
      resultatMois = 0;
      if (m === L) {
        lanceLe.fr = d;
        fondateurs = beta * CONVERSION_BETA;
        p.evenements.push({
          jour: d,
          type: "lancement",
          texte: `Création de la SASU : ${Math.round(fondateurs)} testeurs de la bêta passent à l'abonnement`,
        });
      }
      if (m === M18 && r.pleinTemps) p.evenements.push({ jour: d, type: "age", texte: "Tes 18 ans : à plein temps" });
    }

    const total = clients.fr + clients.franco + clients.sud + fondateurs;

    // International : seuil atteint ET de quoi payer le lancement + 6 mois.
    let coutLancement = 0;
    if (lance && r.international) {
      for (const mk of MARCHES) {
        if (mk.id === "fr" || lanceLe[mk.id] !== null) continue;
        const base = mk.id === "franco" ? clients.fr + fondateurs : total;
        if (base >= mk.seuil && tresorerie >= mk.lancement * 1.5) {
          lanceLe[mk.id] = d;
          coutLancement += mk.lancement;
          p.evenements.push({ jour: d, type: "international", texte: `Lancement : ${mk.nom}` });
        }
      }
    }
    const etrangers = (lanceLe.franco !== null ? 1 : 0) + (lanceLe.sud !== null ? 2 : 0);

    // Équipe.
    let support = 0, dev = 0, commercial = 0, marketing = 0, admin = 0;
    if (lance && r.embauches) {
      support = (total >= 350 ? 1 + Math.floor((total - 350) / 800) : 0) + etrangers;
      dev = [900, 2500, 5000, 8000, 12000, 16000, 20000].filter((s) => total >= s).length + (lanceLe.sud !== null ? 2 : 0);
      commercial = sc.commerciaux.filter((s) => total >= s).length;
      marketing = [2000, 8000, 20000].filter((s) => total >= s).length;
      admin = [15, 30, 50].filter((s) => support + dev + commercial + marketing >= s).length;
    }
    const effectif = support + dev + commercial + marketing + admin;
    const embauches = Math.max(0, effectif - effectifAvant);
    if (embauches > 0 && effectifAvant === 0) p.evenements.push({ jour: d, type: "embauche", texte: "Première embauche" });
    else if (embauches > 0 && [5, 10, 20, 30, 40, 50].some((s) => effectifAvant < s && effectif >= s)) {
      p.evenements.push({ jour: d, type: "embauche", texte: `L'équipe passe à ${effectif} personnes` });
    }
    effectifAvant = effectif;

    // Acquisition, par marché et par canal (taux mensuels ramenés au jour).
    const churnMois = ((sc.churnDebut + (sc.churnFin - sc.churnDebut) * lissage((m - L) / 48)) / 100) * facteurChurn;
    const churnJour = 1 - Math.pow(1 - churnMois, JOUR);
    const canaux = canauxVides();
    const nouveaux: Record<IdMarche, number> = { fr: 0, franco: 0, sud: 0 };
    let pubDepense = 0, partenairesNouveaux = 0;
    if (lance) {
      const actifs = MARCHES.filter((mk) => lanceLe[mk.id] !== null);
      const poidsTotal = actifs.reduce((s, mk) => s + mk.poids, 0);
      for (const mk of actifs) {
        const depuis = (d - (lanceLe[mk.id] as number)) / 30.44;
        const base = clients[mk.id] + (mk.id === "fr" ? fondateurs : 0);
        // Le plafond : la part de marché que le scénario peut tenir. Plus on
        // s'en approche, plus chaque nouveau client coûte d'efforts — c'est
        // ce qui fait plafonner les dernières années.
        // À l'étranger, sans présence sur place, la part tenable est plus
        // petite qu'en France.
        const cap = mk.cap * (sc.capFrance / 44000) * (mk.id === "fr" ? 1 : 0.4);
        const place = Math.pow(Math.max(0, 1 - base / cap), 2);
        const caMk = clients[mk.id] * r.prix + (mk.id === "fr" ? fondateurs * PRIX_TESTEURS : 0);
        const elan = 1 + lissage((total - 20) / 130); // Axel se donne à fond dès que ça marche
        // 05/10 — l'effet boule de neige : plus Compyo a de clients tôt,
        // plus il en gagne ensuite. Avis Google, artisans du coin qui
        // l'utilisent déjà, références à citer : chaque démarchage, chaque
        // recherche et chaque publicité convertit mieux (jusqu'à +60 %
        // vers 500 clients), et Google remonte avec les avis et les pages.
        const preuve = 1 + 0.6 * lissage(total / 500);
        const bao = (sc.bao / 100) * facteurBao * base;
        const toi = mk.id === "fr" ? (m >= M18 && r.pleinTemps ? sc.fondPlein : sc.fondEtud) * elan * preuve : 0;
        const social = mk.id === "fr" ? sc.social * lissage((m + 3) / 9) : sc.social * 0.3 * mk.poids * lissage(depuis / 12);
        const internet = (sc.seoMax * (lv.referencement ? 1 : 0.5) * mk.poids * lissage(depuis / 36) * (1 + 0.5 * lissage(total / 1500)) + social) * preuve;
        let budget = lv.publicite && m - L >= sc.pubDes ? Math.max((sc.pubPct / 100) * caMk, mk.id === "fr" ? sc.pubMin : 0) : 0;
        if (mk.id !== "fr" && depuis < 12) budget += (mk.lancement * 0.25) / 12; // campagne de lancement
        const cac = sc.cac * mk.cacX * Math.sqrt(1 + budget / 15000);
        const pub = budget > 0 ? (budget / cac) * preuve : 0;
        pubDepense += budget;
        const partenaires = lv.partenariats && mk.id === "fr" && m - L >= sc.partenairesDes ? sc.partenaires : 0;
        const comm = commercial * PRODUCTIVITE_COMMERCIAL * (mk.poids / poidsTotal);
        const n = { bao: bao * place * JOUR, demarchage: (toi + partenaires + comm) * place * JOUR, internet: internet * place * JOUR, pub: pub * place * JOUR };
        partenairesNouveaux += partenaires * place * JOUR;
        canaux.bao += n.bao; canaux.demarchage += n.demarchage; canaux.internet += n.internet; canaux.pub += n.pub;
        nouveaux[mk.id] = n.bao + n.demarchage + n.internet + n.pub;
      }
      for (const mk of MARCHES) clients[mk.id] = clients[mk.id] * (1 - churnJour) + nouveaux[mk.id];
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
      canaux.bao += n.bao * JOUR;
      canaux.demarchage += n.demarchage * JOUR;
      canaux.internet += n.internet * JOUR;
      const departBeta = 1 - Math.pow(1 - (sc.churnDebut * 1.5) / 100, JOUR);
      beta = beta * (1 - departBeta) + (n.bao + n.demarchage + n.internet) * JOUR;
    }

    const payants = lance ? clients.fr + clients.franco + clients.sud + fondateurs : 0;
    const caJour = lance ? ((clients.fr + clients.franco + clients.sud) * r.prix + fondateurs * PRIX_TESTEURS) * JOUR : 0;
    const caAn = caJour * 365;

    // Charges du jour.
    const ch = chargesVides();
    if (!lance) {
      ch.ia = (beta * 2 + 25) * JOUR;
    } else {
      const coutIA = 3 * Math.pow(1 - r.baisseIA / 100, (m - L) / 12);
      const parClient = coutIA + 0.015 * r.prix + 0.25 + 0.5 + 0.3 + (lv.factureElectronique ? 0.4 : 0);
      ch.ia = (payants * parClient + palier(payants, [[500, 25], [2000, 250], [10000, 900], [Infinity, 2500]])) * JOUR;
      ch.equipe =
        (support * POSTES.support + dev * POSTES.dev + commercial * POSTES.commercial + marketing * POSTES.marketing +
          admin * POSTES.admin + effectif * OUTILS + (effectif >= 5 ? effectif * LOCAUX : 0)) * JOUR + embauches * RECRUTEMENT;
      const filleuls = lv.parrainage ? canaux.bao : 0;
      ch.pub = pubDepense * JOUR + filleuls * r.prix + partenairesNouveaux * 60 + palier(payants, [[500, 0], [3000, 700], [Infinity, 2500]]) * JOUR;
      ch.reste =
        (palier(caAn, [[100000, 80], [500000, 150], [2000000, 400], [Infinity, 1000]]) + 40 * effectif +
          palier(payants, [[1000, 40], [5000, 250], [Infinity, 700]]) + (payants >= 2000 ? 400 : 40) +
          palier(payants, [[1000, 10], [Infinity, 50]]) + (m - L >= 12 ? 25 : 0) + 23) * JOUR +
        0.01 * caJour + (d === lanceLe.fr ? 225 : 0);
      ch.international = coutLancement + etrangers * 1300 * JOUR;
      // Ton salaire, fixé chaque début de mois selon ce que la société peut payer.
      if (dt.getUTCDate() === 1) {
        salaireMois = r.pleinTemps && m >= M18 ? palier(caAn, [[60000, 0], [150000, 1500], [500000, 2500], [2000000, 4000], [Infinity, 6000]]) : 0;
      }
      ch.toi = salaireMois * 1.8 * JOUR; // charges d'un président de SASU comprises
    }
    const chargesJour = ch.toi + ch.equipe + ch.pub + ch.ia + ch.international + ch.reste;
    const resultatJour = caJour - chargesJour;
    if (!lance) p.avance += chargesJour;
    tresorerie += resultatJour;
    resultatMois += resultatJour;

    // Salaire versé en fin de mois.
    if (finDeMois && salaireMois > 0) {
      poche += salaireMois;
      a.salaireNet += salaireMois;
    }
    if (finDeMois && lance && !rentableNote && resultatMois > 0) {
      rentableNote = true;
      p.premierJourRentable = d;
      p.evenements.push({ jour: d, type: "rentable", texte: `Premier mois rentable (${Math.round(payants)} clients)` });
    }

    a.ca += caJour;
    a.totalCharges += chargesJour;
    a.resultat += resultatJour;
    (Object.keys(ch) as (keyof Charges)[]).forEach((k) => (a.charges[k] += ch[k]));
    (Object.keys(canaux) as (keyof Canaux)[]).forEach((k) => (a.nouveaux[k] += canaux[k]));
    a.clientsFin = payants;
    a.etrangerFin = clients.franco + clients.sud;
    a.effectifFin = effectif;
    a.fin = d;

    // Fin d'exercice : impôt, réserve, part réinvestie, dividendes.
    if (m % 12 === 11 && finDeMois) {
      a.is = impotSocietes(a.resultat);
      tresorerie -= a.is;
      const distribuable = Math.max(0, tresorerie - (RESERVE_MOIS * a.totalCharges) / 12);
      a.reinvesti = (distribuable * r.reinvest) / 100;
      const verse = distribuable - a.reinvesti;
      a.dividendesNets = verse * 0.7;
      tresorerie -= verse;
      poche += a.dividendesNets;
      a.poche = a.salaireNet + a.dividendesNets;
    }

    caCumul += caJour;
    resCumul += resultatJour;
    p.clients[d] = lance ? payants : beta;
    p.etranger[d] = clients.franco + clients.sud;
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
  }
  p.totalPoche = poche;
  p.evenements.sort((x, y) => x.jour - y.jour);
  return p;
}

/** Ce que rapporte chaque levier : la même projection avec et sans lui. */
export function apportDesLeviers(sc: Scenario, r: Reglages) {
  const fin = NB_JOURS - 1;
  return LEVIERS.map((l) => {
    const avec = projeter(sc, { ...r, leviers: { ...r.leviers, [l.id]: true } });
    const sans = projeter(sc, { ...r, leviers: { ...r.leviers, [l.id]: false } });
    return { levier: l, actif: r.leviers[l.id], poche: avec.totalPoche - sans.totalPoche, clients: avec.clients[fin] - sans.clients[fin] };
  }).sort((x, y) => y.poche - x.poche);
}
