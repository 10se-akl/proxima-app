export type Profil = {
  id: string;
  nom: string;
  entreprise: string | null;
  metier: string;
  email: string;
};

export type StatutProjet =
  | "nouveau"
  | "analyse"
  | "devis_genere"
  | "devis_envoye"
  | "accepte"
  | "en_cours"
  | "termine";

export type Priorite = "urgent" | "important" | "normal";

export type TypeChantier =
  | "renovation_complete"
  | "salle_de_bain"
  | "cuisine"
  | "peinture"
  | "toiture"
  | "electricite"
  | "plomberie"
  | "chauffage"
  | "autre";

// "Projet" est désormais le cœur du produit : une demande client enrichie
// (coordonnées, type de chantier, notes, historique). Les devis en sont
// une étape, pas l'inverse. Les champs marqués (à venir) préparent le
// terrain pour les sprints suivants sans nécessiter de nouvelle migration.
export type Projet = {
  id: string;
  artisan_id: string;
  nom_client: string;
  telephone_client: string | null;
  email_client: string | null;
  adresse_client: string | null;
  type_chantier: TypeChantier;
  description: string;
  informations_disponibles: string | null;
  notes: string | null;
  statut: StatutProjet;
  priorite: Priorite;
  accepte_le: string | null;
  demarre_le: string | null;
  termine_le: string | null;
  derniere_modification_le: string | null;
  visite_le: string | null;
  photos_ajoutees_le: string | null;
  questions_manquantes: AnalyseIA | null;
  derniere_analyse_le: string | null;
  photos: string[]; // (à venir) URLs Supabase Storage — vide pour l'instant
  created_at: string;
};

// Réponse structurée attendue de l'IA à l'étape "analyse du projet"
export type AnalyseIA = {
  resume: string;
  informations_manquantes: string[];
  questions_suggerees: string[];
};

export type ParametresEntreprise = {
  id: string;
  artisan_id: string;
  nom_entreprise: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  tva_pct: number;
  cout_horaire: number;
  cout_journalier: number | null;
  prix_km: number;
  forfait_deplacement: number;
  rayon_max_km: number | null;
  marge_defaut_pct: number;
  heures_min_facturables: number;
  logo_url: string | null;
  conditions_generales: string | null;
};

export type CategoriePoste = "main_oeuvre" | "fourniture" | "forfait";

// Ce que l'IA a le droit de produire : JAMAIS de montant en euros.
// Le prix n'est décidé que par le moteur métier (lib/moteur-metier/).
export type PosteTravailIA = {
  description: string;
  categorie: CategoriePoste;
  quantite: number;
  unite: string;
  temps_estime_heures?: number; // uniquement pour categorie = "main_oeuvre"
};

// Ce que le moteur métier calcule à partir des postes IA + des paramètres
// entreprise. C'est CE type qui contient les montants, jamais l'IA.
export type LigneDevisCalculee = {
  description: string;
  categorie: CategoriePoste;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  total: number;
  detail_calcul: string; // justification lisible, affichée à l'artisan
};

export type DevisCalcule = {
  lignes: LigneDevisCalculee[];
  sous_total_ht: number;
  deplacement: number;
  marge_pct: number;
  total_ht: number;
  tva_pct: number;
  montant_tva: number;
  total_ttc: number;
};

export type LigneDevis = LigneDevisCalculee;

export type TypeEvenement = "rendez_vous" | "tache";
export type StatutEvenement = "a_faire" | "termine" | "annule";

export type EvenementPlanning = {
  id: string;
  artisan_id: string;
  demande_id: string | null;
  titre: string;
  type: TypeEvenement;
  date_heure: string;
  duree_minutes: number | null;
  notes: string | null;
  statut: StatutEvenement;
  created_at: string;
};

export type NoteVocale = {
  id: string;
  demande_id: string;
  artisan_id: string;
  transcription: string;
  created_at: string;
};

// Journal d'événements d'un projet — la timeline. Un type = une phrase
// affichée à l'artisan (voir lib/timeline.ts pour les libellés).
// "appel_telephonique" n'est produit par aucun code aujourd'hui : réservé
// pour le futur assistant téléphonique IA, sans migration à prévoir.
export type TypeEvenementProjet =
  | "projet_cree"
  | "message_importe"
  | "infos_completees"
  | "note_ajoutee"
  | "note_vocale_ajoutee"
  | "photo_ajoutee"
  | "visite_effectuee"
  | "analyse_ia"
  | "devis_genere"
  | "devis_valide"
  | "devis_envoye"
  | "devis_accepte"
  | "devis_refuse"
  | "chantier_demarre"
  | "chantier_termine"
  | "priorite_changee"
  | "rdv_planifie"
  | "appel_telephonique";

export type EvenementProjet = {
  id: string;
  demande_id: string;
  artisan_id: string;
  type: TypeEvenementProjet;
  titre: string;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type StatutCandidature = "pending" | "accepted" | "rejected";

export type Candidature = {
  id: string;
  nom: string;
  prenom: string;
  entreprise: string | null;
  metier: string;
  telephone: string;
  email: string;
  nb_employes: string | null;
  devis_par_semaine: string | null;
  probleme_principal: string;
  decouverte: string | null;
  statut: StatutCandidature;
  created_at: string;
};

export type Devis = {
  id: string;
  demande_id: string; // référence au projet (nom de colonne historique conservé en base)
  artisan_id: string;
  numero: string;
  lignes: LigneDevisCalculee[];
  sous_total_ht: number;
  deplacement: number;
  marge_pct: number;
  tva_pct: number;
  montant_tva: number;
  total_estime: number; // total TTC final
  envoye_le: string | null;
  commentaires: string | null;
  statut: "brouillon" | "a_valider" | "envoye" | "refuse";
  created_at: string;
};
