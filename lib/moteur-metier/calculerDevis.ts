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
  { motsCles: ["chape"], prixUnitaire: 28 },
  { motsCles: ["ferraillage", "armature"], prixUnitaire: 4 },
  { motsCles: ["linteau"], prixUnitaire: 65 },
  // Terrassement
  { motsCles: ["terrassement", "décaissement", "decaissement"], prixUnitaire: 45 },
  { motsCles: ["évacuation gravats", "evacuation gravats", "déblais", "deblais"], prixUnitaire: 350 },
  // Façade
  { motsCles: ["ravalement"], prixUnitaire: 48 },
  { motsCles: ["isolation extérieure", "isolation exterieure", "ite"], prixUnitaire: 90 },
  // Serrurerie
  { motsCles: ["serrure", "cylindre"], prixUnitaire: 90 },
  { motsCles: ["porte blindée", "porte blindee"], prixUnitaire: 1800 },
  { motsCles: ["verrou"], prixUnitaire: 45 },
  { motsCles: ["barillet"], prixUnitaire: 35 },
  { motsCles: ["garde-corps", "garde corps", "rambarde"], prixUnitaire: 220 },
  // Vitrerie
  { motsCles: ["vitrage", "double vitrage"], prixUnitaire: 180 },
  { motsCles: ["miroir"], prixUnitaire: 95 },
  { motsCles: ["survitrage"], prixUnitaire: 140 },
  // Charpente / menuiserie bois
  { motsCles: ["charpente"], prixUnitaire: 95 },
  { motsCles: ["poutre"], prixUnitaire: 85 },
  { motsCles: ["solivage", "solive"], prixUnitaire: 55 },
  { motsCles: ["fenêtre", "fenetre"], prixUnitaire: 480 },
  { motsCles: ["baie vitrée", "baie vitree"], prixUnitaire: 1400 },
  { motsCles: ["volet roulant"], prixUnitaire: 380 },
  { motsCles: ["porte de garage"], prixUnitaire: 950 },
  { motsCles: ["porte d'entrée", "porte d'entree"], prixUnitaire: 950 },
  { motsCles: ["placard", "dressing"], prixUnitaire: 420 },
  { motsCles: ["escalier"], prixUnitaire: 2200 },
  // Plaquisterie
  { motsCles: ["cloison", "placo", "plaque de plâtre", "plaque de platre"], prixUnitaire: 28 },
  { motsCles: ["faux plafond"], prixUnitaire: 35 },
  { motsCles: ["rail placo", "ossature métallique", "ossature metallique"], prixUnitaire: 12 },
  { motsCles: ["laine de verre", "laine de roche", "isolant"], prixUnitaire: 18 },
  { motsCles: ["bande à joint", "bande a joint", "enduit de jointoiement"], prixUnitaire: 6 },
  // Carrelage / peinture (au-delà de salle de bain/cuisine déjà couverts)
  { motsCles: ["plinthe"], prixUnitaire: 8 },
  { motsCles: ["joint de carrelage", "joint carrelage"], prixUnitaire: 9 },
  { motsCles: ["primaire d'accrochage", "primaire accrochage", "sous-couche", "sous couche"], prixUnitaire: 15 },
  { motsCles: ["enduit de lissage", "ratissage"], prixUnitaire: 12 },
  // Toiture (au-delà de tuile/gouttière/zinguerie déjà couverts)
  { motsCles: ["ardoise"], prixUnitaire: 35 },
  { motsCles: ["velux", "fenêtre de toit", "fenetre de toit"], prixUnitaire: 850 },
  { motsCles: ["membrane d'étanchéité", "membrane etancheite", "étanchéité toiture", "etancheite toiture"], prixUnitaire: 42 },
  // Plomberie (au-delà de robinet/chauffe-eau/wc déjà couverts)
  { motsCles: ["siphon"], prixUnitaire: 22 },
  { motsCles: ["groupe de sécurité", "groupe de securite"], prixUnitaire: 45 },
  { motsCles: ["adoucisseur"], prixUnitaire: 1200 },
  // Électricité (au-delà de tableau/prise/disjoncteur déjà couverts)
  { motsCles: ["va-et-vient", "va et vient"], prixUnitaire: 45 },
  { motsCles: ["gaine électrique", "gaine electrique"], prixUnitaire: 3 },
  { motsCles: ["câble électrique", "cable electrique"], prixUnitaire: 2 },
  { motsCles: ["détecteur de fumée", "detecteur de fumee"], prixUnitaire: 25 },
  { motsCles: ["borne de recharge", "wallbox"], prixUnitaire: 950 },
  // Chauffage (au-delà de chaudière/radiateur/PAC déjà couverts)
  { motsCles: ["plancher chauffant"], prixUnitaire: 65 },
  { motsCles: ["ballon tampon"], prixUnitaire: 1400 },
  { motsCles: ["vanne thermostatique", "tête thermostatique", "tete thermostatique"], prixUnitaire: 35 },
  // Paysagisme
  { motsCles: ["gazon", "pelouse", "engazonnement"], prixUnitaire: 12 },
  { motsCles: ["clôture", "cloture", "portail"], prixUnitaire: 85 },
  { motsCles: ["terrasse bois", "terrasse composite"], prixUnitaire: 95 },
  { motsCles: ["arrosage automatique"], prixUnitaire: 2200 },
  { motsCles: ["dallage extérieur", "dallage exterieur", "pavage"], prixUnitaire: 55 },
  { motsCles: ["haie", "plantation"], prixUnitaire: 25 },
  { motsCles: ["élagage", "elagage"], prixUnitaire: 180 },
  // Piscine (08/09) — 19ème métier, voir types/index.ts
  { motsCles: ["liner"], prixUnitaire: 2800 },
  { motsCles: ["pompe à chaleur piscine", "pompe a chaleur piscine", "pac piscine"], prixUnitaire: 2200 },
  { motsCles: ["pompe de filtration", "filtration piscine"], prixUnitaire: 650 },
  { motsCles: ["margelle"], prixUnitaire: 55 },
  { motsCles: ["volet de piscine", "volet piscine", "bâche à bulles", "bache a bulles"], prixUnitaire: 3200 },
  { motsCles: ["local technique piscine"], prixUnitaire: 1800 },
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
    montant_marge: montantMarge,
    total_ht: totalHT,
    tva_pct: tvaPct,
    montant_tva: montantTVA,
    total_ttc: totalTTC,
  };
}

function arrondir(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// Mention TVA réduite (08/09) — depuis le 16/02/2025, l'ancienne attestation
// CERFA papier est supprimée : le taux réduit (5,5%/10%) doit être justifié
// par une mention directement sur le devis/la facture, pas un document
// séparé. À la date d'écriture de ce code, l'administration fiscale n'a pas
// publié de formulation officielle unique et définitive — le texte
// ci-dessous reprend la substance la plus largement reprise par les
// professionnels (FFB, éditeurs du secteur), volontairement SUGGÉRÉE
// seulement : toujours modifiable par l'artisan avant validation (voir
// ValiderDevis.tsx), jamais imposée comme un texte figé et certain.
// ============================================================
export function genererMentionTvaReduite(tvaPct: number): string | null {
  if (tvaPct === 10) {
    return "Le client atteste que les travaux se rapportent à des locaux à usage d'habitation achevés depuis plus de deux ans et qu'ils n'entraînent pas la production d'un immeuble neuf ni un agrandissement de la surface de plancher supérieur à 10 % — conditions d'application du taux réduit de TVA de 10 % (article 279-0 bis du CGI).";
  }
  if (tvaPct === 5.5) {
    return "Le client atteste que les travaux se rapportent à des locaux à usage d'habitation achevés depuis plus de deux ans et constituent des travaux d'amélioration de la qualité énergétique — conditions d'application du taux réduit de TVA de 5,5 % (article 278-0 bis A du CGI).";
  }
  return null;
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
// Audit "vérification systématique" (10/09) — trouvé par un agent de
// recherche : DevisPreview.tsx recalculait ce montant par SOUSTRACTION
// (total_ttc - montant_tva - sous_total_ht - deplacement) plutôt que de
// reprendre la formule d'origine — fragile (résidu flottant théorique sur
// une chaîne de soustractions) et incohérent avec la seule vraie source de
// vérité pour ce calcul (recalculerDevis, juste en dessous). Exportée ici
// pour que tout composant qui doit reconstruire ce montant à partir des
// champs déjà stockés sur un devis (sous_total_ht, deplacement, marge_pct)
// utilise exactement la même formule, jamais une reconstruction séparée.
export function calculerMontantMarge(
  sousTotalHt: number,
  deplacement: number,
  margePct: number
): number {
  return arrondir((sousTotalHt + deplacement) * (margePct / 100));
}

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
    montant_marge: montantMarge,
    total_ht: totalHT,
    tva_pct: tvaPct,
    montant_tva: montantTVA,
    total_ttc: totalTTC,
  };
}
