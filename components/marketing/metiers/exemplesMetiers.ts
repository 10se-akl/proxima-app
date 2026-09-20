import { CHECKLISTS_METIER, CHECKLISTS_PAR_METIER } from "@/lib/checklistsMetier";

// ============================================================
// Un chantier type par métier, pour la vitrine de l'accueil (18/09).
//
// Ce sont des EXEMPLES, affichés comme tels : des prix plausibles pour la
// France en 2026, jamais présentés comme ceux d'un client réel. Dans
// l'app, Compyo chiffre avec les tarifs de l'artisan et il valide chaque
// ligne — la vitrine le dit à côté de chaque devis.
//
// Les taux de TVA suivent les règles usuelles pour un logement de plus de
// deux ans (10 %), le taux réduit de 5,5 % pour les menuiseries isolantes,
// et 20 % là où aucun taux réduit ne s'applique (piscine, jardin).
//
// Les questions affichées, elles, ne sont pas des exemples : ce sont les
// vraies checklists de l'app (lib/checklistsMetier.ts).
// ============================================================

export type LigneExemple = {
  designation: string;
  quantite: number;
  unite: string;
  prixUnitaire: number; // HT
};

export type ExempleMetier = {
  id: string; // identique à l'id de l'illustration (LandingImmersive.tsx)
  nom: string;
  chantier: string;
  cotes: [{ libelle: string; valeur: string }, { libelle: string; valeur: string }];
  lignes: LigneExemple[];
  tvaPct: number;
  checklist: string[];
};

type Brut = Omit<ExempleMetier, "checklist"> & {
  typeChantier?: keyof typeof CHECKLISTS_METIER;
};

const BRUTS: Brut[] = [
  {
    id: "plombier",
    nom: "Plombier",
    typeChantier: "plomberie",
    chantier: "Remplacement d'un chauffe-eau 200 L",
    cotes: [
      { libelle: "Volume", valeur: "200 L" },
      { libelle: "Durée", valeur: "½ journée" },
    ],
    lignes: [
      { designation: "Chauffe-eau électrique vertical 200 L", quantite: 1, unite: "u", prixUnitaire: 690 },
      { designation: "Groupe de sécurité et raccords", quantite: 1, unite: "u", prixUnitaire: 48 },
      { designation: "Dépose et évacuation de l'ancien appareil", quantite: 1, unite: "forfait", prixUnitaire: 90 },
      { designation: "Main-d'œuvre", quantite: 3, unite: "h", prixUnitaire: 55 },
    ],
    tvaPct: 10,
  },
  {
    id: "electricien",
    nom: "Électricien",
    typeChantier: "electricite",
    chantier: "Mise aux normes d'un tableau électrique",
    cotes: [
      { libelle: "Logement", valeur: "T3 · 65 m²" },
      { libelle: "Durée", valeur: "1 jour" },
    ],
    lignes: [
      { designation: "Tableau 3 rangées pré-équipé", quantite: 1, unite: "u", prixUnitaire: 420 },
      { designation: "Disjoncteurs divisionnaires", quantite: 12, unite: "u", prixUnitaire: 18 },
      { designation: "Interrupteurs différentiels 30 mA type A", quantite: 2, unite: "u", prixUnitaire: 95 },
      { designation: "Main-d'œuvre", quantite: 7, unite: "h", prixUnitaire: 55 },
    ],
    tvaPct: 10,
  },
  {
    id: "couvreur",
    nom: "Couvreur",
    typeChantier: "toiture",
    chantier: "Réfection d'une toiture en tuiles",
    cotes: [
      { libelle: "Surface", valeur: "80 m²" },
      { libelle: "Durée", valeur: "5 jours" },
    ],
    lignes: [
      { designation: "Échafaudage, montage et démontage", quantite: 1, unite: "forfait", prixUnitaire: 950 },
      { designation: "Dépose des tuiles et évacuation", quantite: 80, unite: "m²", prixUnitaire: 18 },
      { designation: "Écran sous-toiture", quantite: 80, unite: "m²", prixUnitaire: 14 },
      { designation: "Tuiles terre cuite fournies et posées", quantite: 80, unite: "m²", prixUnitaire: 62 },
    ],
    tvaPct: 10,
  },
  {
    id: "peintre",
    nom: "Peintre",
    typeChantier: "peinture",
    chantier: "Peinture complète d'un séjour",
    cotes: [
      { libelle: "Murs", valeur: "48 m²" },
      { libelle: "Durée", valeur: "3 jours" },
    ],
    lignes: [
      { designation: "Protection et préparation des supports", quantite: 48, unite: "m²", prixUnitaire: 6 },
      { designation: "Sous-couche d'impression", quantite: 48, unite: "m²", prixUnitaire: 5.5 },
      { designation: "Peinture murs, deux couches", quantite: 48, unite: "m²", prixUnitaire: 14 },
      { designation: "Peinture plafond, deux couches", quantite: 22, unite: "m²", prixUnitaire: 16 },
    ],
    tvaPct: 10,
  },
  {
    id: "macon",
    nom: "Maçon",
    typeChantier: "maconnerie",
    chantier: "Ouverture d'un mur porteur",
    cotes: [
      { libelle: "Ouverture", valeur: "2,40 m" },
      { libelle: "Durée", valeur: "3 jours" },
    ],
    lignes: [
      { designation: "Étaiement provisoire", quantite: 1, unite: "forfait", prixUnitaire: 380 },
      { designation: "Démolition de maçonnerie", quantite: 4.5, unite: "m²", prixUnitaire: 95 },
      { designation: "Poutre acier fournie et posée", quantite: 1, unite: "u", prixUnitaire: 1150 },
      { designation: "Reprise des enduits", quantite: 6, unite: "m²", prixUnitaire: 42 },
    ],
    tvaPct: 10,
  },
  {
    id: "menuisier",
    nom: "Menuisier",
    typeChantier: "menuiserie",
    chantier: "Trois fenêtres PVC double vitrage",
    cotes: [
      { libelle: "Fenêtres", valeur: "3" },
      { libelle: "Durée", valeur: "1 jour" },
    ],
    lignes: [
      { designation: "Fenêtre PVC deux vantaux", quantite: 3, unite: "u", prixUnitaire: 520 },
      { designation: "Dépose des anciennes menuiseries", quantite: 3, unite: "u", prixUnitaire: 60 },
      { designation: "Pose et calfeutrement", quantite: 3, unite: "u", prixUnitaire: 140 },
    ],
    tvaPct: 5.5,
  },
  {
    id: "carreleur",
    nom: "Carreleur",
    typeChantier: "carrelage",
    chantier: "Carrelage au sol d'une cuisine",
    cotes: [
      { libelle: "Surface", valeur: "18 m²" },
      { libelle: "Format", valeur: "60 × 60" },
    ],
    lignes: [
      { designation: "Ragréage du support", quantite: 18, unite: "m²", prixUnitaire: 12 },
      { designation: "Grès cérame fourni (+10 % de coupe)", quantite: 20, unite: "m²", prixUnitaire: 32 },
      { designation: "Pose collée", quantite: 18, unite: "m²", prixUnitaire: 38 },
      { designation: "Plinthes assorties", quantite: 16, unite: "ml", prixUnitaire: 11 },
    ],
    tvaPct: 10,
  },
  {
    id: "chauffagiste",
    nom: "Chauffagiste",
    typeChantier: "chauffage",
    chantier: "Remplacement d'une chaudière gaz",
    cotes: [
      { libelle: "Puissance", valeur: "25 kW" },
      { libelle: "Durée", valeur: "1 jour" },
    ],
    lignes: [
      { designation: "Chaudière gaz murale à condensation", quantite: 1, unite: "u", prixUnitaire: 2650 },
      { designation: "Dépose et évacuation de l'ancienne", quantite: 1, unite: "forfait", prixUnitaire: 180 },
      { designation: "Raccordements et mise en service", quantite: 1, unite: "forfait", prixUnitaire: 390 },
      { designation: "Main-d'œuvre", quantite: 8, unite: "h", prixUnitaire: 58 },
    ],
    tvaPct: 10,
  },
  {
    id: "serrurier",
    nom: "Serrurier",
    typeChantier: "serrurerie",
    chantier: "Porte claquée et cylindre de sécurité",
    cotes: [
      { libelle: "Intervention", valeur: "Soirée" },
      { libelle: "Durée", valeur: "1 h" },
    ],
    lignes: [
      { designation: "Déplacement", quantite: 1, unite: "forfait", prixUnitaire: 60 },
      { designation: "Ouverture de porte claquée", quantite: 1, unite: "forfait", prixUnitaire: 120 },
      { designation: "Cylindre de sécurité certifié A2P", quantite: 1, unite: "u", prixUnitaire: 145 },
    ],
    tvaPct: 10,
  },
  {
    id: "climaticien",
    nom: "Climaticien",
    typeChantier: "climatisation",
    chantier: "Climatisation réversible deux pièces",
    cotes: [
      { libelle: "Pièces", valeur: "2" },
      { libelle: "Durée", valeur: "1 jour" },
    ],
    lignes: [
      { designation: "Unité extérieure bi-split", quantite: 1, unite: "u", prixUnitaire: 1450 },
      { designation: "Unités intérieures murales", quantite: 2, unite: "u", prixUnitaire: 380 },
      { designation: "Liaisons frigorifiques", quantite: 8, unite: "ml", prixUnitaire: 35 },
      { designation: "Pose et mise en service", quantite: 1, unite: "forfait", prixUnitaire: 520 },
    ],
    tvaPct: 10,
  },
  {
    id: "facadier",
    nom: "Façadier",
    typeChantier: "facade",
    chantier: "Ravalement d'une façade",
    cotes: [
      { libelle: "Surface", valeur: "120 m²" },
      { libelle: "Durée", valeur: "6 jours" },
    ],
    lignes: [
      { designation: "Échafaudage, montage et démontage", quantite: 1, unite: "forfait", prixUnitaire: 1600 },
      { designation: "Nettoyage haute pression", quantite: 120, unite: "m²", prixUnitaire: 6 },
      { designation: "Traitement des fissures", quantite: 30, unite: "ml", prixUnitaire: 18 },
      { designation: "Peinture de façade, deux couches", quantite: 120, unite: "m²", prixUnitaire: 24 },
    ],
    tvaPct: 10,
  },
  {
    id: "plaquiste",
    nom: "Plaquiste",
    typeChantier: "plaquisterie",
    chantier: "Cloison et doublage isolé",
    cotes: [
      { libelle: "Surface", valeur: "55 m²" },
      { libelle: "Durée", valeur: "4 jours" },
    ],
    lignes: [
      { designation: "Cloison 72/48 sur ossature", quantite: 25, unite: "m²", prixUnitaire: 42 },
      { designation: "Doublage isolé 10 + 80", quantite: 30, unite: "m²", prixUnitaire: 48 },
      { designation: "Bandes, enduit et ponçage", quantite: 55, unite: "m²", prixUnitaire: 9 },
    ],
    tvaPct: 10,
  },
  {
    id: "charpentier",
    nom: "Charpentier",
    typeChantier: "charpente",
    chantier: "Traitement et renfort de charpente",
    cotes: [
      { libelle: "Surface", valeur: "60 m²" },
      { libelle: "Durée", valeur: "3 jours" },
    ],
    lignes: [
      { designation: "Traitement insecticide et fongicide", quantite: 60, unite: "m²", prixUnitaire: 16 },
      { designation: "Remplacement de chevrons", quantite: 6, unite: "u", prixUnitaire: 85 },
      { designation: "Renfort de panne", quantite: 1, unite: "forfait", prixUnitaire: 480 },
    ],
    tvaPct: 10,
  },
  {
    id: "terrassier",
    nom: "Terrassier",
    typeChantier: "terrassement",
    chantier: "Terrassement pour une terrasse",
    cotes: [
      { libelle: "Surface", valeur: "30 m²" },
      { libelle: "Profondeur", valeur: "0,30 m" },
    ],
    lignes: [
      { designation: "Décapage de la terre végétale", quantite: 30, unite: "m²", prixUnitaire: 9 },
      { designation: "Déblai", quantite: 9, unite: "m³", prixUnitaire: 38 },
      { designation: "Évacuation des déblais", quantite: 9, unite: "m³", prixUnitaire: 32 },
      { designation: "Hérisson compacté", quantite: 30, unite: "m²", prixUnitaire: 18 },
    ],
    tvaPct: 10,
  },
  {
    id: "vitrier",
    nom: "Vitrier",
    typeChantier: "vitrerie",
    chantier: "Remplacement d'un double vitrage",
    cotes: [
      { libelle: "Dimensions", valeur: "120 × 90" },
      { libelle: "Durée", valeur: "2 h" },
    ],
    lignes: [
      { designation: "Double vitrage 4/16/4 sur mesure", quantite: 1, unite: "u", prixUnitaire: 185 },
      { designation: "Dépose du vitrage cassé", quantite: 1, unite: "forfait", prixUnitaire: 45 },
      { designation: "Pose et joints", quantite: 1, unite: "forfait", prixUnitaire: 90 },
    ],
    tvaPct: 10,
  },
  {
    id: "paysagiste",
    nom: "Paysagiste",
    chantier: "Plantation d'une haie de lauriers",
    cotes: [
      { libelle: "Longueur", valeur: "20 m" },
      { libelle: "Durée", valeur: "2 jours" },
    ],
    lignes: [
      { designation: "Préparation du sol", quantite: 20, unite: "ml", prixUnitaire: 9 },
      { designation: "Plants de laurier (60/80 cm)", quantite: 40, unite: "u", prixUnitaire: 14 },
      { designation: "Plantation et paillage", quantite: 20, unite: "ml", prixUnitaire: 16 },
    ],
    tvaPct: 20,
  },
  {
    id: "pisciniste",
    nom: "Pisciniste",
    typeChantier: "piscine",
    chantier: "Remise en route d'une piscine",
    cotes: [
      { libelle: "Bassin", valeur: "8 × 4 m" },
      { libelle: "Durée", valeur: "½ journée" },
    ],
    lignes: [
      { designation: "Retrait de la bâche et nettoyage", quantite: 1, unite: "forfait", prixUnitaire: 110 },
      { designation: "Contrôle de la filtration", quantite: 1, unite: "forfait", prixUnitaire: 65 },
      { designation: "Traitement choc", quantite: 1, unite: "forfait", prixUnitaire: 45 },
      { designation: "Analyse et équilibrage de l'eau", quantite: 1, unite: "forfait", prixUnitaire: 35 },
    ],
    tvaPct: 20,
  },
  {
    // 20/09 — Dix-huitième métier de lib/metiers.ts, absent jusqu'ici.
    // Une entreprise de rénovation chiffre justement ce que les autres
    // chiffrent séparément : d'où un devis en plusieurs corps d'état.
    id: "renovation",
    nom: "Entreprise de rénovation",
    typeChantier: "autre",
    chantier: "Rénovation complète d'un appartement",
    cotes: [
      { libelle: "Surface", valeur: "62 m²" },
      { libelle: "Durée", valeur: "6 semaines" },
    ],
    lignes: [
      { designation: "Dépose, évacuation et protection des sols", quantite: 1, unite: "forfait", prixUnitaire: 2400 },
      { designation: "Cloisons, doublages et plafonds", quantite: 62, unite: "m²", prixUnitaire: 78 },
      { designation: "Électricité et plomberie, reprise complète", quantite: 1, unite: "forfait", prixUnitaire: 8900 },
      { designation: "Peinture et revêtements de sol", quantite: 62, unite: "m²", prixUnitaire: 96 },
    ],
    tvaPct: 10,
  },
];

export const EXEMPLES_METIERS: ExempleMetier[] = BRUTS.map(({ typeChantier, ...m }) => ({
  ...m,
  checklist: ((typeChantier && CHECKLISTS_METIER[typeChantier]) || CHECKLISTS_PAR_METIER[m.nom] || []).slice(0, 5),
}));

const centimes = (n: number) => Math.round(n * 100);

export function totalLigne(l: LigneExemple): number {
  return centimes(l.quantite * l.prixUnitaire) / 100;
}

export function totaux(m: ExempleMetier): { ht: number; tva: number; ttc: number } {
  const ht = m.lignes.reduce((s, l) => s + centimes(totalLigne(l)), 0) / 100;
  const tva = centimes((ht * m.tvaPct) / 100) / 100;
  return { ht, tva, ttc: (centimes(ht) + centimes(tva)) / 100 };
}
