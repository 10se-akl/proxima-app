// ============================================================
// Taxonomie fixe des retours produit — partagée entre le parcours client
// (components/dashboard/BoutonRetour.tsx) et la route serveur
// (app/api/retours/route.ts).
//
// Refonte : le système précédent faisait passer QUASIMENT chaque retour
// par un appel IA (nettoyage + rapprochement de thème), même pour des
// signalements très simples à classer ("je n'arrive pas à déplacer un
// rendez-vous"). Avec une liste fixe de catégories/sous-catégories,
// 80 à 90 % des retours se rangent directement dans une case connue —
// zéro appel IA, enregistrement instantané, carte mentale mise à jour tout
// de suite. L'IA n'intervient plus que là où elle apporte une vraie
// valeur : catégorie "Autre", sous-catégorie "Autre", nouvelle idée, ou un
// texte libre assez long pour mériter un vrai résumé (voir SEUIL_TEXTE_LONG
// et la logique de app/api/retours/route.ts).
// ============================================================

export type SousCategorie = {
  slug: string;
  label: string;
};

export type Categorie = {
  slug: string;
  label: string;
  icone: string;
  // Une catégorie sans sous-catégorie (ex: "Autre") saute directement
  // l'étape 2 du parcours — rien de pertinent à proposer en dessous.
  sousCategories: SousCategorie[];
};

export const CATEGORIES: Categorie[] = [
  {
    slug: "planning",
    label: "Planning",
    icone: "📅",
    sousCategories: [
      { slug: "deplacer_rdv", label: "Déplacer un rendez-vous" },
      { slug: "ajouter_chantier", label: "Ajouter un chantier" },
      { slug: "modifier_horaire", label: "Modifier un horaire" },
      { slug: "notifications", label: "Notifications" },
      { slug: "synchronisation", label: "Synchronisation" },
      { slug: "fonction_introuvable", label: "Je ne trouve pas une fonction" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "devis",
    label: "Devis",
    icone: "📄",
    sousCategories: [
      { slug: "creer_devis", label: "Créer un devis" },
      { slug: "modifier_devis", label: "Modifier un devis" },
      { slug: "envoyer_devis", label: "Envoyer un devis" },
      { slug: "dupliquer_devis", label: "Dupliquer un devis" },
      { slug: "pdf_mise_en_page", label: "PDF / mise en page" },
      { slug: "prix_incorrects", label: "Prix incorrects" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "appels",
    label: "Appels",
    icone: "📞",
    sousCategories: [
      { slug: "numero_introuvable", label: "Numéro introuvable" },
      { slug: "historique_appels", label: "Historique des appels" },
      { slug: "rappel_client", label: "Rappel client" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "photos",
    label: "Photos",
    icone: "📸",
    sousCategories: [
      { slug: "ajouter_photos", label: "Ajouter des photos" },
      { slug: "chargement_lent", label: "Trop lent à charger" },
      { slug: "organisation_photos", label: "Organisation des photos" },
      { slug: "qualite_photos", label: "Qualité des photos" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "notes_vocales",
    label: "Notes vocales",
    icone: "🎤",
    sousCategories: [
      { slug: "dictee_echoue", label: "Dictée qui échoue" },
      { slug: "transcription_incorrecte", label: "Transcription incorrecte" },
      { slug: "notes_introuvables", label: "Notes difficiles à retrouver" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "ia",
    label: "IA",
    icone: "🤖",
    sousCategories: [
      { slug: "analyse_demande", label: "Analyse de la demande" },
      { slug: "generation_devis", label: "Génération de devis" },
      { slug: "reponse_client", label: "Réponse au client" },
      { slug: "import_message", label: "Import de message / capture" },
      { slug: "resultat_imprecis", label: "Résultat imprécis" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "mobile",
    label: "Application mobile",
    icone: "📱",
    sousCategories: [
      { slug: "ecran_mal_adapte", label: "Écran mal adapté" },
      { slug: "lenteur_mobile", label: "Lenteur sur mobile" },
      { slug: "bouton_difficile", label: "Bouton difficile à atteindre" },
      { slug: "hors_ligne", label: "Hors-ligne" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "performances",
    label: "Performances",
    icone: "⚡",
    sousCategories: [
      { slug: "chargement_lent", label: "Chargement lent" },
      { slug: "application_rame", label: "L'application rame" },
      { slug: "plantage", label: "Plantage" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "bug",
    label: "Bug",
    icone: "🐞",
    sousCategories: [
      { slug: "erreur_affichee", label: "Erreur affichée" },
      { slug: "ecran_fige", label: "Écran figé" },
      { slug: "perte_donnees", label: "Perte de données" },
      { slug: "comportement_inattendu", label: "Comportement inattendu" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "idee",
    label: "Nouvelle idée",
    icone: "💡",
    sousCategories: [
      { slug: "fonctionnalite_manquante", label: "Fonctionnalité manquante" },
      { slug: "automatisation", label: "Automatisation" },
      { slug: "integration_externe", label: "Intégration externe" },
      { slug: "simplification", label: "Simplification" },
      { slug: "autre", label: "Autre" },
    ],
  },
  {
    slug: "autre",
    label: "Autre",
    icone: "📦",
    sousCategories: [],
  },
];

export function trouverCategorie(slug: string): Categorie | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function trouverSousCategorie(categorieSlug: string, sousCategorieSlug: string): SousCategorie | undefined {
  return trouverCategorie(categorieSlug)?.sousCategories.find((s) => s.slug === sousCategorieSlug);
}

// En dessous de ce nombre de caractères, un texte libre est traité comme
// une simple précision (aucun appel IA) plutôt que comme un vrai
// témoignage à résumer — voir app/api/retours/route.ts.
export const SEUIL_TEXTE_LONG = 30;

// Conditions déclenchant un appel IA (voir la brief produit : "L'IA
// n'intervient que lorsqu'elle apporte une vraie valeur"). Un texte vide
// ne déclenche jamais l'IA, même sur "Autre" ou "Nouvelle idée" : sans
// texte, il n'y a rien à résumer ni à rapprocher.
export function necessiteIA(categorieSlug: string, sousCategorieSlug: string | null, texte: string | null): boolean {
  const texteNonVide = Boolean(texte && texte.trim().length > 0);
  if (!texteNonVide) return false;

  const estAutre = categorieSlug === "autre" || sousCategorieSlug === "autre";
  const estIdee = categorieSlug === "idee";
  const texteLong = (texte as string).trim().length >= SEUIL_TEXTE_LONG;

  return estAutre || estIdee || texteLong;
}

// Type legacy (probleme/idee/amelioration/bug), conservé pour compatibilité
// avec l'historique et l'affichage admin existant — dérivé automatiquement
// de la catégorie plutôt que choisi séparément par l'artisan.
export function typeDepuisCategorie(categorieSlug: string): "probleme" | "idee" | "amelioration" | "bug" {
  if (categorieSlug === "bug") return "bug";
  if (categorieSlug === "idee") return "idee";
  return "probleme";
}
