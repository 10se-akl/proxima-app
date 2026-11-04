-- ============================================================
-- Module 54 (04/11/2026) — Les messages de Compyo aux comptes.
--
-- POURQUOI (demande d'Axel) : la cloche de l'app et du site doit aussi
-- porter ce que Compyo dit à ses artisans : une nouvelle fonctionnalité,
-- une réduction, ou un message. Chaque message non lu compte dans le
-- chiffre de la cloche (« 1 »), comme un rappel demandé par l'artisan.
--
-- Deux tables :
--   - annonces : écrites par Axel seul, depuis /admin/annonces (clé
--     service, côté serveur). organisation_id vide = tout le monde ;
--     sinon, une seule entreprise.
--   - annonces_lues : « j'ai vu ce message », une ligne par personne.
--     Ouvrir la cloche suffit. Le chiffre est donc le même sur le
--     téléphone et sur l'ordinateur.
--
-- Sécurité (RLS) :
--   - un compte ne lit que les annonces actives destinées à tous ou à
--     son entreprise ; il ne peut ni en écrire, ni en modifier ;
--   - un compte ne lit et n'écrit que ses propres lignes « lu », et
--     seulement pour une annonce qu'il a le droit de voir.
--
-- Effet sur l'application : tant que ce module n'est pas passé, la
-- cloche fonctionne comme avant, sans la partie « De la part de Compyo »
-- (lib/annonces.ts ignore l'absence des tables).
--
-- Rejouable. Retour arrière : supabase/migrations/54-annonces.retour.sql.
-- ============================================================

create table if not exists annonces (
  id uuid primary key default gen_random_uuid(),
  genre text not null default 'message' check (genre in ('nouveaute', 'offre', 'message')),
  titre text not null check (char_length(titre) between 1 and 120),
  texte text not null default '' check (char_length(texte) <= 1000),
  lien text check (lien is null or lien ~ '^(/|https://)'),
  organisation_id uuid references organisations(id) on delete cascade,
  active boolean not null default true,
  publiee_le timestamptz not null default now()
);

create index if not exists annonces_publiee_le_idx on annonces (publiee_le desc);

alter table annonces enable row level security;

drop policy if exists "un compte lit les annonces qui lui sont destinées" on annonces;
create policy "un compte lit les annonces qui lui sont destinées"
  on annonces for select
  to authenticated
  using (
    active
    and (organisation_id is null or organisation_id in (select mes_organisations()))
  );
-- Aucune règle d'écriture : seule la clé service (serveur, /admin) écrit.

create table if not exists annonces_lues (
  annonce_id uuid not null references annonces(id) on delete cascade,
  profil_id uuid not null references auth.users(id) on delete cascade,
  lue_le timestamptz not null default now(),
  primary key (annonce_id, profil_id)
);

alter table annonces_lues enable row level security;

drop policy if exists "un compte lit ce qu'il a lu" on annonces_lues;
create policy "un compte lit ce qu'il a lu"
  on annonces_lues for select
  to authenticated
  using (profil_id = auth.uid());

drop policy if exists "un compte marque une annonce comme lue" on annonces_lues;
create policy "un compte marque une annonce comme lue"
  on annonces_lues for insert
  to authenticated
  with check (
    profil_id = auth.uid()
    -- La sous-requête passe par la RLS de annonces : seulement une
    -- annonce que ce compte a le droit de voir.
    and exists (select 1 from annonces a where a.id = annonces_lues.annonce_id)
  );

-- APRÈS, pour vérifier (doit renvoyer 2 lignes, rowsecurity = true) :
--   select tablename, rowsecurity from pg_tables
--   where tablename in ('annonces', 'annonces_lues');
