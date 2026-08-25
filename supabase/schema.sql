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

-- Les "drop policy if exists" ci-dessous (et plus bas dans ce fichier)
-- existent uniquement pour que ce script reste réexécutable sans erreur
-- sur une base où il a déjà tourné une fois — Postgres n'a pas d'équivalent
-- de "create policy if not exists" ni de "create or replace policy".
drop policy if exists "un artisan lit son propre profil" on profils;
create policy "un artisan lit son propre profil"
  on profils for select
  using (auth.uid() = id);

drop policy if exists "un artisan modifie son propre profil" on profils;
create policy "un artisan modifie son propre profil"
  on profils for update
  using (auth.uid() = id);

drop policy if exists "un artisan crée son propre profil" on profils;
create policy "un artisan crée son propre profil"
  on profils for insert
  with check (auth.uid() = id);

drop policy if exists "un artisan gère ses propres demandes" on demandes;
create policy "un artisan gère ses propres demandes"
  on demandes for all
  using (auth.uid() = artisan_id)
  with check (auth.uid() = artisan_id);

drop policy if exists "un artisan gère ses propres devis" on devis;
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
drop policy if exists "candidature ouverte à tous" on candidatures;
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

drop policy if exists "un artisan gère ses propres paramètres" on parametres_entreprise;
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

drop policy if exists "un artisan peut enregistrer ses propres logs" on logs;
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

drop policy if exists "un artisan gère son propre planning" on evenements_planning;
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

drop policy if exists "un artisan gère ses propres notes vocales" on notes_vocales;
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

drop policy if exists "un artisan gère ses propres photos" on storage.objects;
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

drop policy if exists "un artisan gère ses propres événements de projet" on evenements_projet;
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

drop policy if exists "un artisan gère son propre logo" on storage.objects;
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

-- ============================================================
-- Module 14 — Comptes d'équipe (multi-utilisateurs).
--
-- Jusqu'ici, un compte Supabase Auth = un artisan = toutes ses données
-- (artisan_id partout). Ça ne marche plus dès qu'un artisan travaille
-- avec quelqu'un d'autre (conjoint, salarié) : soit ils partagent un seul
-- login (aucune traçabilité, aucun moyen de couper l'accès à quelqu'un
-- qui part), soit chacun a son compte et ne voit RIEN de ce que fait
-- l'autre (cloisonnement total, inutilisable en pratique).
--
-- On introduit donc une "organisation" comme véritable frontière de
-- sécurité : chaque table métier gagne une colonne organisation_id, et
-- les RLS filtrent désormais sur l'appartenance à l'organisation (via
-- "memberships") plutôt que sur l'identité exacte du créateur. La colonne
-- artisan_id est CONSERVÉE partout : elle garde son sens original de
-- "qui a créé/est rattaché à cette ligne" (utile pour l'affichage, les
-- logs, l'audit), simplement elle n'est plus ce qui contrôle l'accès.
--
-- Une organisation créée avant ce module (artisan seul) obtient
-- automatiquement une organisation à lui tout seul via le backfill
-- ci-dessous — aucune donnée existante ne bouge, aucun accès ne change
-- pour un artisan solo.
-- ============================================================

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  cree_par uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employe', -- proprietaire | employe
  created_at timestamptz not null default now(),
  -- "unique (user_id)" seul (pas seulement le couple organisation/user) :
  -- tout le code applicatif (getOrganisationId, getMembership...) suppose
  -- qu'un utilisateur appartient à EXACTEMENT une organisation à la fois
  -- (.maybeSingle() partout, jamais de gestion de plusieurs résultats).
  -- Cette contrainte le garantit au niveau base, pas seulement par
  -- convention côté code — repéré lors de la revue de sécurité du Module 14.
  unique (user_id),
  unique (organisation_id, user_id)
);

alter table organisations enable row level security;
alter table memberships enable row level security;

-- Fonction "security definer" : elle tourne avec les droits du
-- propriétaire de la fonction, pas ceux de l'appelant, donc elle N'EST
-- PAS soumise aux policies RLS de la table "memberships" qu'elle
-- interroge. C'est ce qui évite une récursion infinie (une policy sur
-- "memberships" qui aurait besoin d'interroger "memberships" pour
-- s'évaluer elle-même) — le pattern standard recommandé par Supabase
-- pour ce cas de figure.
create or replace function mes_organisations()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select organisation_id from memberships where user_id = auth.uid();
$$;

drop policy if exists "un membre lit les organisations dont il fait partie" on organisations;
create policy "un membre lit les organisations dont il fait partie"
  on organisations for select
  using (id in (select mes_organisations()));

drop policy if exists "un membre lit les membres de ses organisations" on memberships;
create policy "un membre lit les membres de ses organisations"
  on memberships for select
  using (organisation_id in (select mes_organisations()));

-- Aucune policy d'insert/update/delete pour le rôle "authenticated" sur
-- organisations/memberships, volontairement : la création d'une
-- organisation (acceptation de candidature) et l'ajout/retrait d'un
-- membre (invitation d'équipe) passent toujours par une route serveur
-- utilisant la clé service_role — jamais directement depuis le
-- navigateur — même logique de sécurité que pour "candidatures" et
-- "logs" plus haut dans ce fichier.

-- Colonnes organisation_id sur chaque table métier.
alter table demandes add column if not exists organisation_id uuid references organisations(id) on delete cascade;
alter table devis add column if not exists organisation_id uuid references organisations(id) on delete cascade;
alter table parametres_entreprise add column if not exists organisation_id uuid references organisations(id) on delete cascade;
alter table logs add column if not exists organisation_id uuid references organisations(id) on delete cascade;
alter table evenements_planning add column if not exists organisation_id uuid references organisations(id) on delete cascade;
alter table notes_vocales add column if not exists organisation_id uuid references organisations(id) on delete cascade;
alter table evenements_projet add column if not exists organisation_id uuid references organisations(id) on delete cascade;

-- Backfill : un artisan existant qui n'a encore aucune organisation en
-- obtient une à lui tout seul, dont il est propriétaire. Idempotent :
-- ne recrée rien pour un profil qui a déjà une organisation (utile pour
-- pouvoir réexécuter ce fichier sans dégât, comme le reste de ce schéma).
do $$
declare
  p record;
  nouvelle_org_id uuid;
begin
  for p in
    select pr.id, pr.nom, pr.entreprise
    from profils pr
    where not exists (
      select 1 from memberships m where m.user_id = pr.id
    )
  loop
    insert into organisations (nom, cree_par)
    values (coalesce(p.entreprise, p.nom), p.id)
    returning id into nouvelle_org_id;

    insert into memberships (organisation_id, user_id, role)
    values (nouvelle_org_id, p.id, 'proprietaire');

    update demandes set organisation_id = nouvelle_org_id where artisan_id = p.id and organisation_id is null;
    update devis set organisation_id = nouvelle_org_id where artisan_id = p.id and organisation_id is null;
    update parametres_entreprise set organisation_id = nouvelle_org_id where artisan_id = p.id and organisation_id is null;
    update logs set organisation_id = nouvelle_org_id where artisan_id = p.id and organisation_id is null;
    update evenements_planning set organisation_id = nouvelle_org_id where artisan_id = p.id and organisation_id is null;
    update notes_vocales set organisation_id = nouvelle_org_id where artisan_id = p.id and organisation_id is null;
    update evenements_projet set organisation_id = nouvelle_org_id where artisan_id = p.id and organisation_id is null;
  end loop;
end $$;

-- Une fois le backfill passé, organisation_id doit toujours être renseigné
-- pour toute nouvelle ligne — même logique de garde-fou que le reste de
-- ce schéma (artisan_id est "not null" partout ailleurs).
alter table demandes alter column organisation_id set not null;
alter table devis alter column organisation_id set not null;
alter table parametres_entreprise alter column organisation_id set not null;
alter table evenements_planning alter column organisation_id set not null;
alter table notes_vocales alter column organisation_id set not null;
alter table evenements_projet alter column organisation_id set not null;
-- logs reste nullable : un log peut survivre à la suppression de son
-- organisation (on garde une trace), comme il survit déjà à la
-- suppression de son artisan ("on delete set null" plus haut).

-- Les paramètres d'entreprise (TVA, coût horaire, coordonnées...)
-- doivent être partagés par toute l'équipe, pas dupliqués par personne :
-- l'unicité passe de "un par artisan" à "un par organisation".
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'parametres_entreprise_artisan_id_key'
  ) then
    alter table parametres_entreprise drop constraint parametres_entreprise_artisan_id_key;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'parametres_entreprise_organisation_id_key'
  ) then
    alter table parametres_entreprise add constraint parametres_entreprise_organisation_id_key unique (organisation_id);
  end if;
end $$;

-- La numérotation des devis doit être continue pour l'ENTREPRISE (une
-- obligation légale de numérotation chronologique sans trou), pas pour
-- chaque employé séparément — sans quoi deux membres de la même équipe
-- pourraient chacun émettre un devis "2026-014".
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'devis_artisan_numero_unique'
  ) then
    alter table devis drop constraint devis_artisan_numero_unique;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'devis_organisation_numero_unique'
  ) then
    alter table devis add constraint devis_organisation_numero_unique unique (organisation_id, numero);
  end if;
end $$;

-- Remplacement des policies RLS "un artisan gère ses propres X" par des
-- policies "un membre de l'organisation gère les données de son
-- organisation". drop + create (Postgres n'a pas de "create or replace
-- policy") pour pouvoir réexécuter ce fichier sans erreur.
drop policy if exists "un artisan gère ses propres demandes" on demandes;
create policy "un membre gère les demandes de son organisation"
  on demandes for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un artisan gère ses propres devis" on devis;
create policy "un membre gère les devis de son organisation"
  on devis for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un artisan gère ses propres paramètres" on parametres_entreprise;
create policy "un membre gère les paramètres de son organisation"
  on parametres_entreprise for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un artisan gère son propre planning" on evenements_planning;
create policy "un membre gère le planning de son organisation"
  on evenements_planning for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un artisan gère ses propres notes vocales" on notes_vocales;
create policy "un membre gère les notes vocales de son organisation"
  on notes_vocales for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un artisan gère ses propres événements de projet" on evenements_projet;
create policy "un membre gère les événements de projet de son organisation"
  on evenements_projet for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

-- Les logs restent en insert-only côté client (aucune lecture publique,
-- inchangé), mais la contrainte passe elle aussi de l'artisan exact à
-- l'appartenance à l'organisation, pour qu'un salarié puisse logger une
-- action sans que ce soit rattaché à un artisan_id qui n'est pas le sien.
drop policy if exists "un artisan peut enregistrer ses propres logs" on logs;
create policy "un membre peut enregistrer un log pour son organisation"
  on logs for insert
  with check (organisation_id in (select mes_organisations()));

-- Photos/logos en Storage : le chemin de chaque fichier reste préfixé par
-- l'id de la personne qui l'a envoyé (inchangé côté code), mais l'accès
-- s'ouvre maintenant à tout membre de la MÊME organisation que cette
-- personne, pas seulement à elle — sans avoir à déplacer un seul fichier
-- déjà stocké.
drop policy if exists "un artisan gère ses propres photos" on storage.objects;
create policy "un membre de l'organisation gère les photos de l'équipe"
  on storage.objects for all
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from memberships m
      where m.user_id = auth.uid()
      and m.organisation_id in (
        select organisation_id from memberships
        where user_id = ((storage.foldername(name))[1])::uuid
      )
    )
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Un membre doit pouvoir voir le nom/métier de ses coéquipiers (pour
-- l'affichage "créé par ..." et la page de gestion d'équipe), pas
-- seulement son propre profil comme avant l'introduction des
-- organisations. La policy de lecture s'élargit donc ; les policies de
-- modification restent, elles, limitées à son propre profil (personne ne
-- doit pouvoir modifier le profil d'un coéquipier).
drop policy if exists "un artisan lit son propre profil" on profils;
create policy "un membre lit les profils de son organisation"
  on profils for select
  using (
    id = auth.uid()
    or id in (
      select user_id from memberships
      where organisation_id in (select mes_organisations())
    )
  );

drop policy if exists "un artisan gère son propre logo" on storage.objects;
create policy "un membre de l'organisation gère le logo de l'équipe"
  on storage.objects for all
  using (
    bucket_id = 'logos'
    and exists (
      select 1 from memberships m
      where m.user_id = auth.uid()
      and m.organisation_id in (
        select organisation_id from memberships
        where user_id = ((storage.foldername(name))[1])::uuid
      )
    )
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Module 15 — Retours produit ("la carte des problèmes")
--
-- Idée : donner aux artisans un moyen de signaler ce qui leur pose
-- vraiment problème dans Compyo, noter à quel point ça compte pour eux
-- (1 à 10), et voir les problèmes déjà remontés par d'autres — pour
-- identifier rapidement ce qui revient le plus souvent et à quel point
-- c'est urgent, plutôt que de deviner depuis quelques retours épars par
-- email.
--
-- Deux tables : "problemes_produits" (un problème, décrit une seule fois
-- — ex. "Les devis prennent trop de temps à corriger") et
-- "retours_produits" (un artisan qui signale ce problème, avec sa note
-- d'importance — soit en créant un nouveau problème, soit en "votant" sur
-- un problème déjà existant). Le rapprochement entre un nouveau texte
-- libre et un problème déjà existant se fait par IA (voir la route
-- app/api/retours/route.ts) : ce fichier ne contient que la structure et
-- les règles d'accès, pas la logique de rapprochement.
--
-- Point de sécurité important, voulu explicitement par Axel après
-- discussion : les autres artisans doivent voir QUE des problèmes existent
-- et COMBIEN de personnes les remontent, jamais QUI les a remontés. Seul
-- l'admin (Axel) doit voir le détail nominatif. Plutôt que de tenter un
-- masquage de colonne via une vue Postgres (fragile à faire fonctionner
-- correctement avec RLS sans pouvoir le tester en direct dans cet
-- environnement), la lecture agrégée passe entièrement par une route
-- serveur qui utilise createAdminClient() pour lire, agrège en TypeScript,
-- et ne renvoie jamais user_id ni aucun champ identifiant au navigateur
-- pour un artisan non-admin — voir app/api/retours/route.ts (lecture) vs
-- app/api/admin/retours/route.ts (lecture nominative, réservée à
-- process.env.ADMIN_EMAIL). Ici, en base, "retours_produits" n'a donc
-- volontairement AUCUNE policy de lecture large pour "authenticated" :
-- seule une lecture de sa propre ligne est permise directement depuis le
-- navigateur (pour qu'un artisan puisse voir/modifier son propre vote),
-- tout le reste passe par le service_role côté serveur.
-- ============================================================

create table if not exists problemes_produits (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists retours_produits (
  id uuid primary key default gen_random_uuid(),
  probleme_id uuid not null references problemes_produits(id) on delete cascade,
  organisation_id uuid not null references organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  importance smallint not null,
  commentaire text,
  created_at timestamptz not null default now(),
  -- Un artisan qui revote sur le même problème met à jour sa note plutôt
  -- que de créer une deuxième ligne (upsert côté route, voir
  -- app/api/retours/route.ts) : un problème = au plus un avis par personne.
  unique (probleme_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'retours_produits_importance_valide'
  ) then
    alter table retours_produits
      add constraint retours_produits_importance_valide check (importance between 1 and 10);
  end if;
end $$;

alter table problemes_produits enable row level security;
alter table retours_produits enable row level security;

-- Les titres/descriptions de problèmes ne contiennent aucune donnée
-- personnelle (le texte est reformulé de façon neutre par l'IA au moment
-- de la création, voir la route) : lecture ouverte à tout artisan connecté.
drop policy if exists "un artisan connecté lit les problèmes signalés" on problemes_produits;
create policy "un artisan connecté lit les problèmes signalés"
  on problemes_produits for select
  to authenticated
  using (true);

-- Pas de policy d'insert pour "authenticated" ici, volontairement : la
-- création d'un nouveau problème passe toujours par la route serveur
-- (app/api/retours/route.ts), qui appelle d'abord l'IA pour vérifier qu'il
-- ne s'agit pas déjà d'un problème existant avant d'en créer un nouveau —
-- même logique de sécurité que "organisations"/"memberships" plus haut.

-- Un artisan ne peut lire/modifier QUE sa propre ligne de retour — jamais
-- celle d'un autre. C'est ce qui empêche techniquement un artisan de lire
-- le détail nominatif des autres, même en interrogeant la table
-- directement depuis le navigateur plutôt que via l'app.
drop policy if exists "un artisan gère son propre retour" on retours_produits;
create policy "un artisan gère son propre retour"
  on retours_produits for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and organisation_id in (select mes_organisations()));

-- ============================================================
-- Module 16 — Refonte "Retours produit" → carte mentale.
--
-- Axel a testé la V1 (Module 15) et veut une vraie fonctionnalité produit,
-- pas un simple formulaire : un bouton "Faire un retour" toujours
-- accessible dans l'app (texte + type + importance + pièce jointe
-- optionnelle), une IA qui nettoie/résume/regroupe automatiquement, et une
-- page publique "carte mentale" (visualisation en bulles) plutôt qu'une
-- simple liste. Ce module ajoute les colonnes nécessaires sans casser le
-- Module 15 (mêmes tables, mêmes policies de base, uniquement des ajouts).
--
-- - retours_produits.type : catégorise CE retour précis (problème / idée /
--   amélioration / bug) — un même "problème" (thème) peut recevoir des
--   retours de types différents.
-- - retours_produits.texte_original / texte_nettoye : on garde le texte
--   brut tel que tapé par l'artisan (utile à l'admin) ET une version
--   nettoyée par l'IA (fautes/hésitations retirées) utilisée pour
--   l'affichage — "commentaire" (Module 15) reste en place pour ne pas
--   casser l'existant, mais devient un alias du texte nettoyé côté route.
-- - retours_produits.piece_jointe_chemin : chemin dans le bucket storage
--   "retours" (capture d'écran / photo jointe), nullable.
-- - problemes_produits.resume_ia : synthèse courte régénérée par l'IA à
--   chaque nouveau retour rattaché à ce problème (thème) — évite à Axel de
--   lire tous les messages un par un pour comprendre le sujet.
-- - problemes_produits.propositions_ia : pistes d'amélioration générées à
--   la demande par l'IA (bouton dédié côté admin), mises en cache ici
--   plutôt que régénérées à chaque affichage.
-- ============================================================

alter table retours_produits
  add column if not exists type text not null default 'probleme',
  add column if not exists texte_original text,
  add column if not exists texte_nettoye text,
  add column if not exists piece_jointe_chemin text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'retours_produits_type_valide'
  ) then
    alter table retours_produits
      add constraint retours_produits_type_valide
      check (type in ('probleme', 'idee', 'amelioration', 'bug'));
  end if;
end $$;

alter table problemes_produits
  add column if not exists resume_ia text,
  add column if not exists propositions_ia text;

-- Bucket privé pour les pièces jointes (capture d'écran / photo) : même
-- schéma de sécurité que "photos"/"logos" plus haut — un fichier est rangé
-- sous {user_id}/{...}, et seul ce user_id peut y accéder directement.
-- L'admin y accède via createAdminClient() (service_role, bypass RLS) pour
-- générer une URL signée côté route API, jamais en donnant l'accès direct
-- au bucket à "authenticated".
insert into storage.buckets (id, name, public)
values ('retours', 'retours', false)
on conflict (id) do nothing;

drop policy if exists "un artisan gère ses propres pièces jointes de retour" on storage.objects;
create policy "un artisan gère ses propres pièces jointes de retour"
  on storage.objects for all
  using (bucket_id = 'retours' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'retours' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Module 17 — Index de performance (Audit Cycle 2, Agent Scalabilité).
--
-- Constat de l'audit : un seul index existait dans tout le schéma
-- (evenements_projet_demande_id_idx). Or presque toutes les requêtes de
-- l'app filtrent par organisation_id (dashboard, projets, planning,
-- devis, retours) — sans index, Postgres doit parcourir la table entière
-- (seq scan) dès qu'elle dépasse quelques dizaines de milliers de lignes,
-- aggravé par le filtre RLS (mes_organisations()) qui s'applique en plus.
--
-- Sans risque : "create index if not exists" est idempotent, et en
-- production sur une table déjà peuplée on écrirait plutôt
-- "create index concurrently" pour ne pas verrouiller la table pendant la
-- construction — non utilisé ici pour rester dans un unique script
-- ré-exécutable simplement (cohérent avec le choix déjà fait pour tout
-- schema.sql), la table est encore petite en bêta privée.
-- ============================================================

create index if not exists demandes_organisation_id_created_at_idx
  on demandes (organisation_id, created_at desc);

create index if not exists devis_organisation_id_statut_idx
  on devis (organisation_id, statut);

create index if not exists devis_demande_id_idx
  on devis (demande_id, created_at desc);

create index if not exists evenements_planning_organisation_id_date_idx
  on evenements_planning (organisation_id, date_heure);

create index if not exists notes_vocales_demande_id_idx
  on notes_vocales (demande_id, created_at desc);

create index if not exists retours_produits_probleme_id_idx
  on retours_produits (probleme_id);

create index if not exists memberships_organisation_id_idx
  on memberships (organisation_id);

-- app/api/retours/route.ts (GET, public) chargeait TOUTE la table
-- retours_produits en mémoire côté serveur pour agréger en JavaScript
-- (comptage + moyenne par thème) — O(thèmes × avis), et c'est la route la
-- plus exposée du produit (accessible sans connexion). Cette fonction
-- déplace l'agrégation dans Postgres, qui sait le faire en un seul
-- balayage indexé (voir retours_produits_probleme_id_idx ci-dessus) quel
-- que soit le volume de retours.
create or replace function retours_agreges()
returns table (probleme_id uuid, nombre_avis bigint, importance_moyenne numeric)
language sql
stable
as $$
  select probleme_id, count(*) as nombre_avis, avg(importance) as importance_moyenne
  from retours_produits
  group by probleme_id
$$;

-- Module 18 — Garde-fou anti-régénération devis (Audit Cycle 2, Agent
-- Performance). analyser-demande bloquait déjà un appel IA si rien n'a
-- changé depuis la dernière analyse (derniere_modification_le <=
-- derniere_analyse_le) ; generer-devis n'avait rien d'équivalent, alors que
-- c'est l'appel IA le plus coûteux du produit. Même logique, appliquée ici.
alter table demandes add column if not exists dernier_devis_genere_le timestamptz;

-- Module 19 — Garde-fou de fréquence sur les routes IA (Audit Cycle 2,
-- Agents Sécurité + Scalabilité). Rien n'empêchait un compte compromis (ou
-- un script mal intentionné) d'appeler les routes /api/ai/* en boucle —
-- chaque appel a un coût réel (API Claude). lib/limiteIA.ts compte, par
-- organisation, les appels déjà tracés dans "logs" (succès et échecs
-- confondus, un échec consomme quand même l'appel) sur la dernière heure
-- et les dernières 24h. Cet index rend cette lecture rapide même quand la
-- table logs grossit, plutôt qu'un balayage complet à chaque appel IA.
create index if not exists logs_organisation_id_type_created_at_idx
  on logs (organisation_id, type, created_at desc);

-- Module 20 — Retours produit : catégories fixes, garde-fou anti-IA
-- systématique (refonte du parcours "Faire un retour", voir
-- lib/retours/taxonomie.ts et app/api/retours/route.ts).
--
-- Avant : quasiment CHAQUE retour passait par un appel Claude (nettoyage +
-- rapprochement de thème), même pour un signalement trivial ("je n'arrive
-- pas à déplacer un rendez-vous"). Désormais, une catégorie + sous-catégorie
-- choisies dans une liste fixe suffisent à rattacher le retour à une bulle
-- de la carte mentale SANS appel IA — l'index unique ci-dessous permet un
-- upsert déterministe sur (categorie, sous_categorie). L'IA ne reste
-- déclenchée que pour "Autre", "Nouvelle idée", ou un texte libre assez
-- long pour mériter un vrai résumé — dans ce cas la bulle créée/rapprochée
-- garde categorie/sous_categorie à NULL (thème "libre", pas rattaché à une
-- case fixe), ce qui ne rentre jamais en conflit avec l'index unique
-- (Postgres traite chaque paire de NULL comme distincte).
alter table retours_produits add column if not exists categorie text;
alter table retours_produits add column if not exists sous_categorie text;

alter table problemes_produits add column if not exists categorie text;
alter table problemes_produits add column if not exists sous_categorie text;

create unique index if not exists problemes_produits_categorie_sous_categorie_key
  on problemes_produits (categorie, sous_categorie);

-- Module 21 — Refonte visuelle de la carte mentale ("le cerveau de
-- Compyo") : chaque planète représente désormais une CATÉGORIE entière
-- (Planning, Devis, Appels...), pas un sous-thème isolé — les
-- catégories/sous-catégories déjà en place (Module 20) suffisent pour ça
-- côté lecture, aucune nouvelle colonne de rattachement nécessaire.
--
-- Seul ajout : une table très simple pour le bouton "Créer une tâche" du
-- panneau admin — convertir un thème remonté par les artisans en note de
-- travail actionnable, sans quitter la page. Accès exclusivement via le
-- client admin (service role, RLS activée mais sans policy : personne côté
-- client/anon n'y accède, même en connaissant l'URL).
create table if not exists ameliorations_produit (
  id uuid primary key default gen_random_uuid(),
  categorie text not null,
  titre text not null,
  statut text not null default 'a_faire',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ameliorations_produit_statut_valide'
  ) then
    alter table ameliorations_produit
      add constraint ameliorations_produit_statut_valide
      check (statut in ('a_faire', 'en_cours', 'fait'));
  end if;
end $$;

alter table ameliorations_produit enable row level security;

create index if not exists ameliorations_produit_categorie_idx
  on ameliorations_produit (categorie, created_at desc);

-- Module 22 — Audit pré-beta (25/08) : 3 correctifs de sécurité/intégrité
-- trouvés par une revue multi-agents, à 2 semaines de l'arrivée des
-- premiers beta testeurs.

-- 1. La policy "select using (true)" sur problemes_produits (Module 15)
--    s'applique à TOUTES ses colonnes, y compris propositions_ia — les
--    pistes d'amélioration internes générées à la demande pour Axel (voir
--    app/api/admin/retours/propositions/route.ts), censées être réservées
--    à ADMIN_EMAIL. N'importe quel artisan connecté pouvait la lire
--    directement via le client Supabase navigateur, en contournant la
--    vérification admin de la route. On retire juste le droit de lecture
--    sur cette colonne précise pour les rôles "standards" — le reste de la
--    table (titre, description, resume_ia, compteurs) reste public comme
--    prévu, et le service_role (routes admin) n'est jamais concerné par un
--    revoke de privilèges de rôle.
revoke select (propositions_ia) on problemes_produits from authenticated, anon;

-- 2. La policy "devis for all" (plus haut dans ce fichier) autorisait tout
--    membre de l'organisation à modifier n'importe quel devis, quel que
--    soit son statut — seul l'écran (ValiderDevis, affiché uniquement pour
--    statut = 'brouillon') empêchait en pratique l'édition d'un devis déjà
--    envoyé. On remplace ce "for all" par 4 policies séparées : la lecture,
--    la création et la suppression restent ouvertes à toute l'organisation,
--    mais la MODIFICATION n'est plus permise que si le devis est encore
--    "brouillon" au moment de la requête (USING porte sur la ligne
--    existante) — les transitions légitimes brouillon → envoyé et
--    brouillon → refusé restent possibles (la ligne est encore "brouillon"
--    juste avant cette transition précise), mais un devis déjà envoyé ou
--    refusé ne peut plus jamais être modifié en base, même par un appel
--    direct qui contournerait l'UI.
drop policy if exists "un membre gère les devis de son organisation" on devis;

create policy "un membre lit les devis de son organisation"
  on devis for select
  using (organisation_id in (select mes_organisations()));

create policy "un membre crée des devis pour son organisation"
  on devis for insert
  with check (organisation_id in (select mes_organisations()));

create policy "un membre modifie un devis encore brouillon"
  on devis for update
  using (organisation_id in (select mes_organisations()) and statut = 'brouillon')
  with check (organisation_id in (select mes_organisations()));

create policy "un membre supprime les devis de son organisation"
  on devis for delete
  using (organisation_id in (select mes_organisations()));

-- 3. Doublons de thèmes libres sur la carte mentale (cas C, voir
--    app/api/retours/route.ts) : deux artisans qui remontent le même sujet
--    à quelques secondes d'écart peuvent chacun déclencher un appel IA qui
--    lit la liste des thèmes existants AVANT que l'autre n'ait inséré le
--    sien — les deux décident alors de créer un nouveau thème. Un index
--    unique partiel + une fonction dédiée ramènent le "vérifier puis
--    insérer" à une seule opération atomique côté base (au lieu de deux
--    allers-retours séparés par 1 à 3 secondes d'appel IA) : si le titre
--    généré par l'IA est strictement identique à un thème déjà créé entre
--    temps dans la même catégorie, on s'y rattache au lieu d'en recréer un
--    second. Ça ne couvre que le cas d'un titre identique (le cas le plus
--    fréquent pour un sujet vraiment identique) — deux formulations
--    différentes du même problème générées par l'IA en parallèle restent
--    théoriquement possibles ; un verrou distribué complet serait
--    disproportionné pour l'échelle d'une beta et peut attendre un futur
--    cycle si ça s'avère un vrai problème en pratique (fusion manuelle
--    possible côté admin en attendant).
create unique index if not exists problemes_produits_categorie_titre_libre_key
  on problemes_produits (categorie, titre)
  where sous_categorie is null;

create or replace function creer_theme_produit_libre(
  p_categorie text,
  p_titre text,
  p_description text,
  p_resume_ia text
) returns problemes_produits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ligne problemes_produits;
begin
  insert into problemes_produits (titre, categorie, description, resume_ia)
  values (p_titre, p_categorie, p_description, p_resume_ia)
  on conflict (categorie, titre) where sous_categorie is null
  do update set resume_ia = coalesce(excluded.resume_ia, problemes_produits.resume_ia)
  returning * into v_ligne;

  return v_ligne;
end;
$$;

-- Module 23 — Écran de maintenance. Un seul indicateur global (pas une
-- table par organisation : c'est Axel, le seul développeur, qui bascule ça
-- pendant qu'il travaille de nuit, pour tout le monde en même temps). RLS
-- activée sans policy pour "authenticated"/"anon" : lu uniquement via
-- lib/supabase/admin.ts (service_role) dans le middleware, jamais
-- directement depuis le navigateur — un visiteur ne doit pas pouvoir
-- interroger cette table pour savoir si Axel est en train de déployer.
create table if not exists parametres_systeme (
  cle text primary key,
  valeur boolean not null default false,
  mis_a_jour_le timestamptz not null default now()
);

alter table parametres_systeme enable row level security;

insert into parametres_systeme (cle, valeur)
values ('maintenance_actif', false)
on conflict (cle) do nothing;
