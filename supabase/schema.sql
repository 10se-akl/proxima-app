-- ============================================================
-- Schéma Proxima MVP — à exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- Profil artisan, lié 1:1 à un utilisateur Supabase Auth (auth.users)
create table if not exists profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  entreprise text,
  metier text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Demandes clients saisies par l'artisan
create table if not exists demandes (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references profils(id) on delete cascade,
  nom_client text not null,
  description text not null,
  informations_disponibles text,
  statut text not null default 'nouvelle', -- nouvelle | analysee | devis_genere
  questions_manquantes jsonb, -- réponse structurée de l'IA (étape "analyse")
  created_at timestamptz not null default now()
);

-- Devis générés à partir d'une demande
create table if not exists devis (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references demandes(id) on delete cascade,
  artisan_id uuid not null references profils(id) on delete cascade,
  numero text not null,
  lignes jsonb not null, -- [{ description, quantite, unite, prix_unitaire, total }]
  total_estime numeric(10, 2) not null,
  statut text not null default 'brouillon', -- brouillon | a_valider | envoye
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security : chaque artisan ne voit QUE ses données.
-- Non négociable, même pour un MVP — voir section "risques"
-- de l'analyse d'architecture.
-- ============================================================

alter table profils enable row level security;
alter table demandes enable row level security;
alter table devis enable row level security;

create policy "un artisan lit son propre profil"
  on profils for select
  using (auth.uid() = id);

create policy "un artisan modifie son propre profil"
  on profils for update
  using (auth.uid() = id);

create policy "un artisan crée son propre profil"
  on profils for insert
  with check (auth.uid() = id);

create policy "un artisan gère ses propres demandes"
  on demandes for all
  using (auth.uid() = artisan_id)
  with check (auth.uid() = artisan_id);

create policy "un artisan gère ses propres devis"
  on devis for all
  using (auth.uid() = artisan_id)
  with check (auth.uid() = artisan_id);

-- ============================================================
-- Bêta privée : candidatures d'accès (avant création de compte)
-- ============================================================

create table if not exists candidatures (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  entreprise text,
  metier text not null,
  telephone text not null,
  email text not null,
  nb_employes text,
  devis_par_semaine text,
  probleme_principal text not null,
  decouverte text,
  statut text not null default 'pending', -- pending | accepted | rejected
  created_at timestamptz not null default now()
);

alter table candidatures enable row level security;

-- N'importe qui (visiteur non connecté) peut déposer une candidature.
create policy "candidature ouverte à tous"
  on candidatures for insert
  with check (true);

-- Volontairement AUCUNE policy de lecture/mise à jour pour le rôle public :
-- seule une clé service_role (utilisée uniquement dans les routes admin
-- côté serveur, jamais côté navigateur) peut lire ou modifier les
-- candidatures. C'est ce qui protège la liste des candidats.

-- ============================================================
-- Paramètres entreprise : chaque artisan configure ses propres règles
-- de calcul. Le moteur métier (lib/moteur-metier/) s'appuie UNIQUEMENT
-- sur ces valeurs — jamais sur une estimation de l'IA.
-- ============================================================

create table if not exists parametres_entreprise (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null unique references profils(id) on delete cascade,
  adresse text,
  telephone text,
  email text,
  tva_pct numeric(5, 2) not null default 20,
  cout_horaire numeric(10, 2) not null default 45,
  cout_journalier numeric(10, 2),
  prix_km numeric(10, 2) not null default 0,
  forfait_deplacement numeric(10, 2) not null default 0,
  rayon_max_km numeric(10, 2),
  marge_defaut_pct numeric(5, 2) not null default 15,
  heures_min_facturables numeric(5, 2) not null default 1,
  created_at timestamptz not null default now()
);

alter table parametres_entreprise enable row level security;

create policy "un artisan gère ses propres paramètres"
  on parametres_entreprise for all
  using (auth.uid() = artisan_id)
  with check (auth.uid() = artisan_id);

-- Le devis stockait uniquement un total avant. On ajoute le détail du
-- calcul (sous-total, déplacement, marge, TVA) pour que chaque montant
-- affiché soit justifiable, comme demandé.
alter table devis add column if not exists sous_total_ht numeric(10, 2);
alter table devis add column if not exists deplacement numeric(10, 2) default 0;
alter table devis add column if not exists marge_pct numeric(5, 2);
alter table devis add column if not exists tva_pct numeric(5, 2);
alter table devis add column if not exists montant_tva numeric(10, 2);
-- total_estime représente désormais le total TTC final.

-- ============================================================
-- Module 1 — Le Projet est le cœur du produit.
-- On enrichit la table "demandes" existante plutôt que de la renommer :
-- renommer une table déjà en production casserait tout ce qui a été
-- construit jusqu'ici pour un bénéfice purement cosmétique. Le nom de
-- colonne "demandes" reste en base, mais dans le code et l'interface,
-- c'est désormais un "Projet" (voir types/index.ts : `Projet`).
-- ============================================================

alter table demandes add column if not exists telephone_client text;
alter table demandes add column if not exists email_client text;
alter table demandes add column if not exists adresse_client text;
alter table demandes add column if not exists type_chantier text not null default 'autre';
alter table demandes add column if not exists notes text;
alter table demandes add column if not exists photos jsonb not null default '[]'::jsonb;
alter table demandes add column if not exists priorite text not null default 'normal'; -- urgent | important | normal
alter table demandes add column if not exists accepte_le timestamptz;
alter table demandes add column if not exists demarre_le timestamptz;
alter table demandes add column if not exists termine_le timestamptz;
alter table demandes add column if not exists derniere_modification_le timestamptz;
alter table demandes add column if not exists visite_le timestamptz;
alter table demandes add column if not exists photos_ajoutees_le timestamptz;
-- statut passe de 3 à 7 valeurs possibles :
-- nouveau | analyse | devis_genere | devis_envoye | accepte | en_cours | termine
-- (pas de contrainte SQL stricte pour rester simple à faire évoluer)

alter table devis add column if not exists envoye_le timestamptz;

alter table parametres_entreprise add column if not exists nom_entreprise text;

-- ============================================================
-- Module 10 — Logs. Chaque appel IA, chaque devis généré, chaque erreur
-- est enregistré ici pour comprendre ce qui se passe pendant la bêta.
-- Lecture réservée à l'admin (clé service_role), jamais publique.
-- ============================================================

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references profils(id) on delete set null,
  type text not null, -- analyse_ia | devis_genere | reponse_generee | erreur_ia
  contexte text,       -- ex: id du projet concerné
  details jsonb,
  created_at timestamptz not null default now()
);

alter table logs enable row level security;

create policy "un artisan peut enregistrer ses propres logs"
  on logs for insert
  with check (auth.uid() = artisan_id);

-- Aucune policy de lecture publique : seule la clé service_role
-- (panneau admin) peut consulter les logs.

-- ============================================================
-- Module 6 — Planning. Une seule table pour rendez-vous ET tâches
-- ponctuelles (ex: "Envoyer devis", "Rappeler Durand") : un artisan ne
-- pense pas en deux catégories séparées, son planning est unifié.
-- Aucun calcul, aucune IA : uniquement de la base de données.
-- ============================================================

create table if not exists evenements_planning (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references profils(id) on delete cascade,
  demande_id uuid references demandes(id) on delete set null, -- projet lié, optionnel
  titre text not null,
  type text not null default 'rendez_vous', -- rendez_vous | tache
  date_heure timestamptz not null,
  duree_minutes integer,
  notes text,
  statut text not null default 'a_faire', -- a_faire | termine | annule
  created_at timestamptz not null default now()
);

alter table evenements_planning enable row level security;

create policy "un artisan gère son propre planning"
  on evenements_planning for all
  using (auth.uid() = artisan_id)
  with check (auth.uid() = artisan_id);

-- ============================================================
-- Notes vocales — la voix est transcrite en texte directement dans le
-- navigateur (gratuit, aucun appel IA, aucun fichier audio stocké).
-- Seul le texte transcrit est enregistré, comme une note horodatée liée
-- au projet.
-- ============================================================

create table if not exists notes_vocales (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references demandes(id) on delete cascade,
  artisan_id uuid not null references profils(id) on delete cascade,
  transcription text not null,
  created_at timestamptz not null default now()
);

alter table notes_vocales enable row level security;

create policy "un artisan gère ses propres notes vocales"
  on notes_vocales for all
  using (auth.uid() = artisan_id)
  with check (auth.uid() = artisan_id);

-- ============================================================
-- Photos de projet — stockage sécurisé (Supabase Storage).
-- Chaque fichier est rangé sous un chemin {artisan_id}/{demande_id}/{nom},
-- et la règle ci-dessous garantit qu'un artisan ne peut accéder qu'aux
-- fichiers rangés sous SON PROPRE id — jamais ceux d'un autre artisan.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "un artisan gère ses propres photos"
  on storage.objects for all
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Module 11 — Timeline du projet. Journal d'événements unique, alimenté
-- automatiquement à chaque action déjà existante (aucune saisie
-- supplémentaire pour l'artisan, aucun appel IA). Remplace la
-- reconstruction ad-hoc à partir de colonnes éparpillées sur "demandes" :
-- désormais, ajouter un nouveau type d'événement ne demande plus de
-- migration, juste une ligne insérée depuis le code.
--
-- "metadata" prépare aussi l'arrivée future de l'assistant téléphonique
-- IA (type 'appel_telephonique', avec résumé/durée en jsonb) sans
-- nécessiter de nouvelle migration le moment venu.
-- ============================================================

create table if not exists evenements_projet (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references demandes(id) on delete cascade,
  artisan_id uuid not null references profils(id) on delete cascade,
  type text not null, -- voir lib/timeline.ts pour la liste des types
  titre text not null,
  detail text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Module 12 — Numéro de devis unique par artisan. Le code calcule le
-- numéro en comptant les devis déjà émis puis en ajoutant 1 (ex :
-- 2026-014). Sans cette contrainte, deux requêtes concurrentes (double
-- clic accidentel, deux onglets ouverts au même moment) pourraient
-- compter le même total et créer deux devis avec le même numéro — ce
-- qui viole l'obligation légale de numérotation unique, chronologique
-- et continue. La base refuse maintenant l'insertion dans ce cas, et
-- le code (voir app/api/ai/generer-devis/route.ts) réessaie avec le
-- numéro suivant si ça arrive.
-- ============================================================

-- Postgres ne supporte pas "add constraint if not exists" — ce bloc
-- ajoute la contrainte seulement si elle n'existe pas déjà, pour pouvoir
-- réexécuter ce fichier sans erreur.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'devis_artisan_numero_unique'
  ) then
    alter table devis add constraint devis_artisan_numero_unique
      unique (artisan_id, numero);
  end if;
end $$;

create index if not exists evenements_projet_demande_id_idx
  on evenements_projet (demande_id, created_at);

alter table evenements_projet enable row level security;

create policy "un artisan gère ses propres événements de projet"
  on evenements_projet for all
  using (auth.uid() = artisan_id)
  with check (auth.uid() = artisan_id);

-- ============================================================
-- Module 12 — Devis éditable, validé, exporté en PDF professionnel.
-- Le devis reste calculé par le moteur métier (lib/moteur-metier/) ; ces
-- colonnes ne font qu'enregistrer les ajustements manuels de l'artisan
-- (lignes modifiées, commentaires) et les éléments d'identité visuelle
-- utilisés pour un export imprimé soigné (logo, conditions générales).
-- Aucune IA n'intervient dans aucune de ces colonnes.
-- ============================================================

alter table devis add column if not exists commentaires text;
-- statut passe de 3 à 4 valeurs possibles :
-- brouillon | a_valider | envoye | refuse
-- (toujours pas de contrainte SQL stricte, cohérent avec le reste du schéma)

alter table parametres_entreprise add column if not exists logo_url text;
alter table parametres_entreprise add column if not exists conditions_generales text;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', false)
on conflict (id) do nothing;

create policy "un artisan gère son propre logo"
  on storage.objects for all
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Module 13 — Éviter de relancer l'analyse IA quand rien n'a changé
-- depuis la dernière fois. On horodate chaque analyse pour la comparer à
-- derniere_modification_le (déjà utilisé pour détecter un devis périmé) :
-- même logique, même colonne de référence, juste appliquée à l'analyse.
-- ============================================================

alter table demandes add column if not exists derniere_analyse_le timestamptz;
