import type {
  ParametresEntreprise,
  PosteTravailIA,
  LigneDevisCalculee,
  DevisCalcule,
} from "@/types";

// ============================================================
// Moteur métier — 100% TypeScript, aucun appel IA, aucun réseau.
// Chaque fonction est pure et testable indépendamment.
// L'IA ne doit JAMAIS entrer dans ce fichier.
// ============================================================

// Tarifs de référence internes pour les fournitures/matériaux, en
// attendant un vrai catalogue fournisseur (voir roadmap "évolutivité").
// Affiché comme "estimation par défaut" tant qu'aucun catalogue réel
// n'est connecté — jamais présenté comme un prix ferme.
//
// Couvre volontairement plusieurs corps de métier (pas seulement la
// rénovation salle de bain/cuisine) : Compyo cible aussi les plombiers,
// électriciens, chauffagistes et couvreurs — le catalogue doit refléter
// leur travail, pas seulement celui d'un maçon-rénovateur.
const REFERENCE_MATERIAUX: { motsCles: string[]; prixUnitaire: number }[] = [
  // Salle de bain / cuisine
  { motsCles: ["faïence", "carrelage mural"], prixUnitaire: 45 },
  { motsCles: ["carrelage sol"], prixUnitaire: 38 },
  { motsCles: ["receveur", "bac à douche", "bac a douche"], prixUnitaire: 380 },
  { motsCles: ["meuble", "cuisine"], prixUnitaire: 320 },
  // Peinture
  { motsCles: ["peinture"], prixUnitaire: 28 },
  // Toiture / couverture
  { motsCles: ["tuile"], prixUnitaire: 22 },
  { motsCles: ["gouttière", "gouttiere", "descente eaux pluviales"], prixUnitaire: 45 },
  { motsCles: ["zinguerie", "zinc"], prixUnitaire: 55 },
  { motsCles: ["isolation combles", "isolation toiture"], prixUnitaire: 32 },
  // Électricité
  { motsCles: ["tableau électrique", "tableau electrique"], prixUnitaire: 450 },
  { motsCles: ["prise", "point lumineux", "interrupteur"], prixUnitaire: 65 },
  { motsCles: ["disjoncteur"], prixUnitaire: 40 },
  { motsCles: ["luminaire", "applique", "spot"], prixUnitaire: 55 },
  // Plomberie
  { motsCles: ["robinet", "robinetterie", "mitigeur"], prixUnitaire: 120 },
  { motsCles: ["chauffe-eau", "chauffe eau", "ballon d'eau chaude"], prixUnitaire: 650 },
  { motsCles: ["wc", "toilettes", "cuvette"], prixUnitaire: 280 },
  { motsCles: ["évacuation", "evacuation", "canalisation", "tuyauterie"], prixUnitaire: 40 },
  // Chauffage
  { motsCles: ["chaudière", "chaudiere"], prixUnitaire: 2800 },
  { motsCles: ["radiateur"], prixUnitaire: 220 },
  { motsCles: ["pompe à chaleur", "pompe a chaleur", "pac"], prixUnitaire: 6500 },
  { motsCles: ["thermostat", "programmateur"], prixUnitaire: 130 },
  { motsCles: ["climatisation", "clim"], prixUnitaire: 1400 },
  // Sprint Beta Final (27/08) — 🔴G : le catalogue ne couvrait que les
  // métiers déjà présents dans TypeChantier (plombier, électricien,
  // chauffagiste, couvreur, peintre). Avec l'élargissement de la liste
  // des métiers (voir lib/metiers.ts), un maçon, un menuisier ou un
  // carreleur tombait systématiquement sur le tarif générique par défaut
  // (60€), quel que soit le poste — mêmes quelques repères que pour les
  // métiers déjà couverts, pas un vrai catalogue fournisseur.
  // Maçonnerie / gros œuvre
  { motsCles: ["parpaing", "agglo"], prixUnitaire: 3 },
  { motsCles: ["béton", "beton", "dalle"], prixUnitaire: 110 },
  { motsCles: ["enduit"], prixUnitaire: 32 },
  // Terrassement
  { motsCles: ["terrassement", "décaissement", "decaissement"], prixUnitaire: 45 },
  { motsCles: ["évacuation gravats", "evacuation gravats", "déblais", "deblais"], prixUnitaire: 350 },
  // Façade
  { motsCles: ["ravalement"], prixUnitaire: 48 },
  { motsCles: ["isolation extérieure", "isolation exterieure", "ite"], prixUnitaire: 90 },
  // Serrurerie
  { motsCles: ["serrure", "cylindre"], prixUnitaire: 90 },
  { motsCles: ["porte blindée", "porte blindee"], prixUnitaire: 1800 },
  // Vitrerie
  { motsCles: ["vitrage", "double vitrage"], prixUnitaire: 180 },
  // Charpente / menuiserie bois
  { motsCles: ["charpente"], prixUnitaire: 95 },
  { motsCles: ["fenêtre", "fenetre"], prixUnitaire: 480 },
  { motsCles: ["porte d'entrée", "porte d'entree"], prixUnitaire: 950 },
  { motsCles: ["placard", "dressing"], prixUnitaire: 420 },
  { motsCles: ["escalier"], prixUnitaire: 2200 },
  // Plaquisterie
  { motsCles: ["cloison", "placo", "plaque de plâtre", "plaque de platre"], prixUnitaire: 28 },
  { motsCles: ["faux plafond"], prixUnitaire: 35 },
  // Carrelage (au-delà de salle de bain/cuisine déjà couverts plus haut)
  { motsCles: ["plinthe"], prixUnitaire: 8 },
  // Paysagisme
  { motsCles: ["gazon", "pelouse", "engazonnement"], prixUnitaire: 12 },
  { motsCles: ["clôture", "cloture", "portail"], prixUnitaire: 85 },
  { motsCles: ["terrasse bois", "terrasse composite"], prixUnitaire: 95 },
  { motsCles: ["arrosage automatique"], prixUnitaire: 2200 },
];

const PRIX_DEFAUT_FOURNITURE = 60;

function trouverPrixReference(description: string): number {
  const texte = description.toLowerCase();
  for (const ref of REFERENCE_MATERIAUX) {
    if (ref.motsCles.some((mot) => texte.includes(mot))) {
      return ref.prixUnitaire;
    }
  }
  return PRIX_DEFAUT_FOURNITURE;
}

// Seuil à partir duquel un poste de main d'œuvre bascule en tarif jour
// plutôt qu'horaire — voir calculerLigne(). 7h plutôt que 8 pile : une
// journée de chantier inclut trajet/installation/rangement, un artisan qui
// estime "7h de pose" pense déjà en termes de journée complète, pas d'un
// gros reliquat d'heures.
const SEUIL_HEURES_JOURNEE = 7;
const HEURES_PAR_JOURNEE = 8;

function calculerLigne(
  poste: PosteTravailIA,
  parametres: ParametresEntreprise
): LigneDevisCalculee {
  if (poste.categorie === "main_oeuvre") {
    const temps = poste.temps_estime_heures ?? poste.quantite;

    // Revue métier (06/09) — "cout_journalier" était configurable dans
    // Paramètres mais jamais lu ici : un maçon, un couvreur, un
    // charpentier ou un terrassier qui chiffre plusieurs jours de chantier
    // raisonne naturellement en tarif jour, pas en multipliant des heures.
    // Bascule automatique dès que le temps estimé atteint une journée
    // complète ET que l'artisan a configuré ce tarif — sinon (petite
    // intervention, ou champ laissé vide) le calcul horaire habituel
    // s'applique sans aucun changement de comportement.
    if (temps >= SEUIL_HEURES_JOURNEE && parametres.cout_journalier) {
      // Arrondi au demi-jour supérieur : jamais moins facturé que le temps
      // réellement estimé, cohérent avec la façon dont un artisan compte
      // ses journées sur un chantier de plusieurs jours.
      const jours = Math.ceil((temps / HEURES_PAR_JOURNEE) * 2) / 2;
      const prixUnitaire = parametres.cout_journalier;
      const total = Math.round(jours * prixUnitaire * 100) / 100;
      return {
        description: poste.description,
        categorie: poste.categorie,
        quantite: jours,
        unite: "jour",
        prix_unitaire: prixUnitaire,
        total,
        detail_calcul: `${jours} jour${jours > 1 ? "s" : ""} × ${prixUnitaire}€/jour (${temps}h estimées, coût journalier configuré)`,
      };
    }

    const prixUnitaire = parametres.cout_horaire;
    const total = Math.round(temps * prixUnitaire * 100) / 100;
    return {
      description: poste.description,
      categorie: poste.categorie,
      quantite: temps,
      unite: "heure",
      prix_unitaire: prixUnitaire,
      total,
      detail_calcul: `${temps}h × ${prixUnitaire}€/h (coût horaire configuré)`,
    };
  }

  // fourniture ou forfait : tarif de référence interne
  const prixUnitaire = trouverPrixReference(poste.description);
  const total = Math.round(prixUnitaire * poste.quantite * 100) / 100;
  return {
    description: poste.description,
    categorie: poste.categorie,
    quantite: poste.quantite,
    unite: poste.unite,
    prix_unitaire: prixUnitaire,
    total,
    detail_calcul: `Tarif de référence interne : ${prixUnitaire}€/${poste.unite} — à ajuster selon vos fournisseurs`,
  };
}

// Ajuste le total main d'œuvre si le temps facturé est sous le minimum
// configuré par l'artisan (ex : "1h minimum même pour un petit dépannage").
//
// Filtre désormais explicitement sur unite === "heure" (06/09) : depuis que
// calculerLigne() peut produire des lignes en tarif JOUR (voir
// SEUIL_HEURES_JOURNEE), sommer leur "quantite" comme si c'était des heures
// aurait mélangé les deux unités — un poste de "1.5 jour" aurait compté
// pour 1.5 dans ce total, presque toujours sous le seuil minimum, et
// déclenché un ajustement absurde sur un chantier qui dure déjà plusieurs
// jours. Un poste déjà facturé au jour n'a de toute façon aucune raison de
// repasser sous un plancher pensé pour les petites interventions horaires.
function appliquerHeuresMinimum(
  lignes: LigneDevisCalculee[],
  parametres: ParametresEntreprise
): LigneDevisCalculee[] {
  const totalHeures = lignes
    .filter((l) => l.categorie === "main_oeuvre" && l.unite === "heure")
    .reduce((s, l) => s + l.quantite, 0);

  if (totalHeures === 0 || totalHeures >= parametres.heures_min_facturables) {
    return lignes;
  }

  const heuresManquantes = parametres.heures_min_facturables - totalHeures;
  const complement: LigneDevisCalculee = {
    description: "Ajustement heures minimum facturables",
    categorie: "main_oeuvre",
    quantite: heuresManquantes,
    unite: "heure",
    prix_unitaire: parametres.cout_horaire,
    total: Math.round(heuresManquantes * parametres.cout_horaire * 100) / 100,
    detail_calcul: `Complément pour atteindre le minimum de ${parametres.heures_min_facturables}h configuré`,
  };

  return [...lignes, complement];
}

export function calculerDevis(
  postes: PosteTravailIA[],
  parametres: ParametresEntreprise
): DevisCalcule {
  let lignes = postes.map((p) => calculerLigne(p, parametres));
  lignes = appliquerHeuresMinimum(lignes, parametres);

  const sousTotalHT = arrondir(lignes.reduce((s, l) => s + l.total, 0));

  // Déplacement : forfait fixe pour l'instant (pas de calcul de distance
  // réelle tant qu'aucune géolocalisation n'est branchée — voir roadmap).
  const deplacement = arrondir(parametres.forfait_deplacement);

  const avantMarge = sousTotalHT + deplacement;
  const margePct = parametres.marge_defaut_pct;
  const montantMarge = arrondir(avantMarge * (margePct / 100));

  const totalHT = arrondir(avantMarge + montantMarge);
  const tvaPct = parametres.tva_pct;
  const montantTVA = arrondir(totalHT * (tvaPct / 100));
  const totalTTC = arrondir(totalHT + montantTVA);

  return {
    lignes,
    sous_total_ht: sousTotalHT,
    deplacement,
    marge_pct: margePct,
    total_ht: totalHT,
    tva_pct: tvaPct,
    montant_tva: montantTVA,
    total_ttc: totalTTC,
  };
}

function arrondir(n: number): number {
  return Math.round(n * 100) / 100;
}

// Paramètres par défaut utilisés UNIQUEMENT si l'artisan n'a pas encore
// configuré son entreprise, pour ne jamais bloquer la génération d'un
// devis — mais l'interface doit toujours l'inviter à les personnaliser.
export const PARAMETRES_PAR_DEFAUT: Omit<ParametresEntreprise, "id" | "artisan_id" | "organisation_id"> = {
  nom_entreprise: null,
  adresse: null,
  telephone: null,
  email: null,
  tva_pct: 20,
  cout_horaire: 45,
  cout_journalier: null,
  forfait_deplacement: 0,
  marge_defaut_pct: 15,
  heures_min_facturables: 1,
  logo_url: null,
  conditions_generales: null,
  // Module 28 (06/09) — voir types/index.ts. Nécessaires uniquement pour
  // générer une facture (jamais pour un devis) — nulles/désactivées par
  // défaut, à compléter par l'artisan avant sa première facture.
  siret: null,
  forme_juridique: null,
  numero_tva_intracommunautaire: null,
  mention_tva_non_applicable: false,
  assurance_decennale_compagnie: null,
  assurance_decennale_police: null,
  iban: null,
  bic: null,
};

// ============================================================
// Recalcul d'un devis déjà généré, après modification manuelle par
// l'artisan (étape de validation, avant export PDF). Toujours 100%
// déterministe, toujours zéro IA : on ne fait que ré-appliquer les
// mêmes formules que calculerDevis() à des lignes et des taux que
// l'artisan a lui-même ajustés. C'est la même logique de calcul, jamais
// une nouvelle estimation.
// ============================================================
export function recalculerDevis(
  lignes: LigneDevisCalculee[],
  deplacement: number,
  margePct: number,
  tvaPct: number
): Omit<DevisCalcule, "lignes"> {
  const sousTotalHT = arrondir(lignes.reduce((s, l) => s + l.total, 0));

  const avantMarge = sousTotalHT + deplacement;
  const montantMarge = arrondir(avantMarge * (margePct / 100));

  const totalHT = arrondir(avantMarge + montantMarge);
  const montantTVA = arrondir(totalHT * (tvaPct / 100));
  const totalTTC = arrondir(totalHT + montantTVA);

  return {
    sous_total_ht: sousTotalHT,
    deplacement: arrondir(deplacement),
    marge_pct: margePct,
    total_ht: totalHT,
    tva_pct: tvaPct,
    montant_tva: montantTVA,
    total_ttc: totalTTC,
  };
}
