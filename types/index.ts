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

// Revue métier (06/09) — élargi de 9 à 20 valeurs pour couvrir les 18
// métiers de lib/metiers.ts (auparavant, un serrurier, un carreleur, un
// menuisier... tombaient systématiquement sur "autre", aucune information
// ne les distinguait). "salle_de_bain"/"cuisine"/"renovation_complete"
// restent des catégories de NATURE de chantier (transverses à plusieurs
// métiers à la fois — un plombier, un carreleur ET un électricien peuvent
// tous les trois travailler sur "une salle de bain"), les nouvelles
// valeurs ci-dessous sont, elles, spécifiques à un seul métier — voir
// lib/metiers.ts pour la correspondance exacte, un métier vers un type.
export type TypeChantier =
  | "renovation_complete"
  | "salle_de_bain"
  | "cuisine"
  | "peinture"
  | "toiture"
  | "electricite"
  | "plomberie"
  | "chauffage"
  | "maconnerie"
  | "terrassement"
  | "facade"
  | "serrurerie"
  | "vitrerie"
  | "charpente"
  | "menuiserie"
  | "plaquisterie"
  | "carrelage"
  | "amenagement_exterieur"
  | "climatisation"
  // Revue métier (08/09) — 19ème métier ajouté après étude de marché : le
  // pisciniste est un vrai métier BTP à part entière (construction ET
  // entretien récurrent, hivernage/remise en route saisonnière — exactement
  // le même schéma que le paysagiste, déjà couvert par le rappel client
  // récurrent), absent jusqu'ici de la liste.
  | "piscine"
  | "autre";

// "Projet" est désormais le cœur du produit : une demande client enrichie
// (coordonnées, type de chantier, notes, historique). Les devis en sont
// une étape, pas l'inverse. Les champs marqués (à venir) préparent le
// terrain pour les sprints suivants sans nécessiter de nouvelle migration.
export type Projet = {
  id: string;
  artisan_id: string;
  organisation_id: string;
  nom_client: string;
  telephone_client: string | null;
  email_client: string | null;
  adresse_client: string | null;
  client_id: string | null;
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

// "Premier contact sans friction" (26/08) — brouillon préparé par l'IA à
// partir d'un message/partage brut, jamais enregistré directement en base
// (voir lib/ai/brouillonProjet.ts). Chaque champ variable porte son niveau
// de confiance : "explicite" = valeur recopiée telle quelle du texte
// source, "deduit" = valeur résolue/interprétée par l'IA (ex. "mardi
// prochain" → une vraie date), "absent" = rien trouvé. L'artisan reste
// toujours libre de corriger avant validation, quel que soit le niveau.
export type NiveauConfiance = "explicite" | "deduit" | "absent";

export type ChampBrouillon<T> = {
  valeur: T;
  confiance: NiveauConfiance;
};

export type BrouillonProjet = {
  nomClient: ChampBrouillon<string | null>;
  telephoneClient: ChampBrouillon<string | null>;
  adresseClient: ChampBrouillon<string | null>;
  typeChantier: ChampBrouillon<TypeChantier>;
  resume: ChampBrouillon<string>;
  priorite: ChampBrouillon<Priorite>;
  rdvDate: ChampBrouillon<string | null>;
  rdvHeure: ChampBrouillon<string | null>;
  // Conservé pour traçabilité et comme filet de sécurité si tous les
  // champs ci-dessus sont "absent" (voir BrouillonProjet.tsx) : l'artisan
  // garde toujours accès au texte d'origine complet, jamais perdu.
  texteOrigine: string;
};

export type ParametresEntreprise = {
  id: string;
  artisan_id: string;
  organisation_id: string;
  nom_entreprise: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  tva_pct: number;
  cout_horaire: number;
  // Utilisé par calculerLigne() (lib/moteur-metier/calculerDevis.ts)
  // au-delà d'une journée de travail estimée sur un même poste, sinon
  // c'est cout_horaire qui s'applique.
  cout_journalier: number | null;
  forfait_deplacement: number;
  // Revue métier (06/09) — "prix_km" et "rayon_max_km" existent encore
  // comme colonnes en base (jamais supprimées, aucune migration
  // destructrice) mais ont été retirés de ce type et du formulaire
  // Paramètres : ils n'étaient lus nulle part dans le calcul du devis,
  // seul forfait_deplacement compte réellement. Voir schema.sql si un
  // vrai calcul par distance (géolocalisation) est construit plus tard.
  marge_defaut_pct: number;
  heures_min_facturables: number;
  logo_url: string | null;
  conditions_generales: string | null;
  // Module 28 (06/09) — informations légales nécessaires à la facturation,
  // absentes jusqu'ici (le devis n'est pas un document fiscal). Voir
  // supabase/schema.sql pour le détail de chaque champ.
  siret: string | null;
  forme_juridique: string | null;
  numero_tva_intracommunautaire: string | null;
  mention_tva_non_applicable: boolean;
  assurance_decennale_compagnie: string | null;
  assurance_decennale_police: string | null;
  iban: string | null;
  bic: string | null;
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
  // Audit "vérification systématique" (10/09) — déjà calculé en interne par
  // recalculerDevis() mais jamais exposé jusqu'ici : ValiderDevis.tsx et
  // DevisPublicClient.tsx affichaient Sous-total HT/Déplacement/TVA/Total
  // TTC SANS la ligne Marge (contrairement à DevisPreview.tsx), rendant
  // impossible de vérifier le total à la main sur ces deux écrans.
  montant_marge: number;
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
  organisation_id: string;
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
  organisation_id: string;
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
  | "note_terminee"
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
  | "appel_telephonique"
  | "facture_creee"
  | "facture_payee"
  | "avoir_cree"
  // Journal chantier vocal (06/09) — voir app/api/ai/interpreter-note-vocale.
  | "journal_chantier_interprete";

export type EvenementProjet = {
  id: string;
  demande_id: string;
  artisan_id: string;
  organisation_id: string;
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

// Notes professionnelles (29/08) — voir Module 27, supabase/schema.sql
// pour la philosophie complète. "verte/orange/rouge" plutôt que
// "faible/moyenne/importante" en base : c'est la valeur affichée ET
// stockée, cohérent avec le point coloré sur chaque carte (voir
// components/notes/NoteCard.tsx) — un seul vocabulaire, jamais de mapping
// texte↔couleur à maintenir en double.
export type ImportanceNote = "verte" | "orange" | "rouge";
export type StatutNote = "active" | "terminee";

export type Note = {
  id: string;
  organisation_id: string;
  artisan_id: string;
  demande_id: string | null;
  titre: string;
  description: string | null;
  importance: ImportanceNote;
  rappel_a: string | null;
  notifie_a: string | null;
  // Vu dans l'app via la pop-up "Compris" (29/08, Module 27ter) — distinct
  // de notifie_a qui suit l'envoi PUSH, voir lib/notes/index.ts.
  vu_le: string | null;
  statut: StatutNote;
  termine_le: string | null;
  created_at: string;
  updated_at: string;
  // Présent uniquement quand la note est chargée avec sa jointure projet
  // (voir lib/notes/index.ts) — permet d'afficher "Projet : Dupont" sans
  // requête supplémentaire depuis la page Notes ou le centre de
  // notifications, qui n'ont pas déjà le projet en contexte contrairement
  // à la fiche projet.
  demandes?: { nom_client: string } | null;
};

// Abonnement push d'un navigateur/appareil — voir Module 27bis.
export type AbonnementPush = {
  id: string;
  organisation_id: string;
  artisan_id: string;
  endpoint: string;
  cle_p256dh: string;
  cle_auth: string;
  created_at: string;
};

export type Devis = {
  id: string;
  demande_id: string; // référence au projet (nom de colonne historique conservé en base)
  artisan_id: string;
  organisation_id: string;
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
  // Anti-oubli (06/09) — postes probablement manquants détectés par l'IA au
  // moment de la génération (voir app/api/ai/generer-devis/route.ts), déjà
  // chiffrés par le moteur déterministe. Suggestions à accepter/ignorer sur
  // l'écran de validation (ValiderDevis.tsx) — jamais ajoutées seules.
  suggestions_oublis: LigneDevisCalculee[] | null;
  // Mention TVA réduite (08/09) — suggérée automatiquement quand le taux
  // choisi est 5,5% ou 10% (voir lib/moteur-metier/calculerDevis.ts,
  // genererMentionTvaReduite), mais toujours modifiable par l'artisan avant
  // validation : la formulation légale exacte n'est pas figée par
  // l'administration fiscale au moment où ceci est écrit, mieux vaut un
  // texte éditable qu'une fausse certitude. Null au taux normal (20%).
  mention_tva_reduite: string | null;
  // Signature électronique en ligne (08/09) — voir supabase/schema.sql,
  // Module 31. Renseignés uniquement une fois le client passé par le lien
  // public et signé — null tant que le devis n'a reçu aucune réponse.
  signature_nom: string | null;
  signature_data: string | null;
  signature_ip: string | null;
  signature_user_agent: string | null;
  signe_le: string | null;
  // Audit pré-bêta (09/09) — true si l'artisan avait déjà configuré ses
  // paramètres d'entreprise (tarif horaire, marge, TVA) au moment où CE
  // devis a été chiffré ; false s'il a été calculé avec les valeurs par
  // défaut (voir PARAMETRES_PAR_DEFAUT, lib/moteur-metier/calculerDevis.ts).
  // Null pour les devis créés avant ce correctif (état inconnu, jamais
  // affiché comme un avertissement rétroactif). Fige l'état AU MOMENT de
  // la génération — ne se met jamais à jour tout seul après coup.
  parametres_configures: boolean | null;
  // Notification de relance (10/09) — voir app/api/cron/relance-devis/
  // route.ts. Non-null une fois le palier notifié, pour ne jamais
  // renotifier deux fois le même palier au fil des passages du cron.
  notifie_relance_j5_le: string | null;
  notifie_relance_j10_le: string | null;
};

// ============================================================
// Module 28 (06/09) — Facturation. Voir supabase/schema.sql pour le détail
// des règles (numérotation continue, immutabilité une fois émise...).
// ============================================================

export type TypeFacture = "facture" | "acompte" | "avoir";
export type StatutFacture = "emise" | "payee" | "annulee";

// Réutilise la même forme que les lignes de devis (description, quantité,
// prix, total) — une facture affiche des lignes déjà connues (copiées du
// devis, ou une ligne unique "Acompte de X%"), jamais un nouveau calcul IA.
export type LigneFacture = LigneDevisCalculee;

// Instantané figé des informations légales de l'entreprise au moment de
// l'émission — voir le commentaire sur la colonne "mentions_legales" dans
// supabase/schema.sql. Sous-ensemble de ParametresEntreprise, uniquement
// les champs qui doivent apparaître sur le document.
export type MentionsLegalesFacture = {
  nom_entreprise: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  siret: string | null;
  forme_juridique: string | null;
  numero_tva_intracommunautaire: string | null;
  mention_tva_non_applicable: boolean;
  assurance_decennale_compagnie: string | null;
  assurance_decennale_police: string | null;
  iban: string | null;
  bic: string | null;
  // Mention TVA réduite (08/09) — reprise telle quelle du devis d'origine
  // au moment de l'émission (voir figerMentionsLegales), figée comme le
  // reste des mentions légales une fois la facture émise.
  mention_tva_reduite: string | null;
};

export type Facture = {
  id: string;
  organisation_id: string;
  demande_id: string;
  devis_id: string | null;
  client_id: string | null;
  artisan_id: string;
  type: TypeFacture;
  numero: string;
  statut: StatutFacture;
  lignes: LigneFacture[];
  sous_total_ht: number;
  tva_pct: number;
  montant_tva: number;
  total_ttc: number;
  facture_liee_id: string | null;
  mentions_legales: MentionsLegalesFacture;
  date_emission: string;
  date_echeance: string | null;
  // Bilan mensuel (08/09) — distincte de date_emission : une facture peut
  // être émise fin de mois et payée le mois suivant. "Combien encaissé ce
  // mois-ci" doit se baser sur CETTE date, jamais date_emission (voir
  // lib/bilan-mensuel.ts). Null tant que statut != "payee".
  payee_le: string | null;
  created_at: string;
};
