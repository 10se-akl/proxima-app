-- ============================================================
-- Module 47 (refonte, duel A, 03/10) — Fichiers rangés par entreprise :
-- ouverture. TEMPS 1 (additif) : à passer AVANT de pousser la branche.
--
-- POURQUOI. L'accès à une photo ou à un logo dépendait de l'appartenance
-- ACTUELLE de la personne qui l'avait envoyé (premier segment du chemin :
-- son identifiant ; policies des lignes 625 et 663 de schema.sql) :
--   F6a — un membre retiré : toute l'équipe perdait ses photos de
--         chantier et le logo qu'il avait envoyé ;
--   F6b — invité ensuite dans une AUTRE entreprise, ses photos de chantier
--         devenaient lisibles par cette autre entreprise (fuite entre
--         clients) ;
--   F13 — un compte sans entreprise (candidat en attente, membre retiré)
--         pouvait écrire dans son propre dossier sans limite.
--
-- CE QUE FAIT CE MODULE, SANS DÉPLACER UN SEUL FICHIER.
-- 1. Les NOUVEAUX fichiers vont sous {organisation}/{auteur}/… (photos)
--    et {organisation}/… (logos). Une seule policy les ouvre à toute
--    l'entreprise, quel que soit l'auteur et même après son départ ; on
--    n'y écrit que sous son propre identifiant en deuxième segment (pour
--    les photos : l'auteur reste lisible dans le chemin).
-- 2. Les ANCIENS fichiers restent où ils sont. Une table figée,
--    fichiers_historiques, rattache chacun à son entreprise (relevé dans
--    demandes.photos, devis.photos_incluses, partages_entrants et
--    parametres_entreprise.logo_url). Deux policies les ouvrent en
--    lecture et en suppression à cette entreprise.
--    On ne réécrit aucun chemin : devis.photos_incluses est figé par le
--    verrou du devis, et l'auteur d'une photo est dans son chemin.
-- 3. Les anciennes policies (par auteur) restent en place pendant tout le
--    temps 1 : le code actuel continue d'envoyer sous {auteur}/… sans rien
--    casser. Le Module 50 les retirera, au moins deux semaines après la
--    mise en production du nouveau code.
--
-- Rejouable. Retour arrière : supabase/migrations/47-fichiers-par-entreprise.retour.sql.
-- ============================================================

-- 1. Les nouveaux fichiers : {organisation}/{auteur}/… et {organisation}/…
drop policy if exists "un membre gère les fichiers de son organisation" on storage.objects;
create policy "un membre gère les fichiers de son organisation"
  on storage.objects for all
  to authenticated
  using (
    bucket_id in ('photos', 'logos')
    and (storage.foldername(name))[1] in (select m::text from public.mes_organisations() as t(m))
  )
  with check (
    bucket_id in ('photos', 'logos')
    and (storage.foldername(name))[1] in (select m::text from public.mes_organisations() as t(m))
    and (bucket_id = 'logos' or (storage.foldername(name))[2] = auth.uid()::text)
  );

-- 2. Les anciens fichiers, rattachés une fois pour toutes à leur
-- entreprise. Aucune écriture côté navigateur.
create table if not exists fichiers_historiques (
  bucket_id text not null,
  chemin text not null,
  organisation_id uuid not null references organisations(id) on delete cascade,
  primary key (bucket_id, chemin)
);

create index if not exists fichiers_historiques_organisation_idx
  on fichiers_historiques (organisation_id);

alter table fichiers_historiques enable row level security;

drop policy if exists "un membre lit les anciens fichiers de son organisation" on fichiers_historiques;
create policy "un membre lit les anciens fichiers de son organisation"
  on fichiers_historiques for select
  using (organisation_id in (select mes_organisations()));

drop policy if exists "un membre lit les anciens fichiers de son organisation" on storage.objects;
create policy "un membre lit les anciens fichiers de son organisation"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('photos', 'logos')
    and exists (
      select 1 from public.fichiers_historiques f
      where f.bucket_id = objects.bucket_id
        and f.chemin = objects.name
        and f.organisation_id in (select public.mes_organisations())
    )
  );

drop policy if exists "un membre supprime les anciens fichiers de son organisation" on storage.objects;
create policy "un membre supprime les anciens fichiers de son organisation"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('photos', 'logos')
    and exists (
      select 1 from public.fichiers_historiques f
      where f.bucket_id = objects.bucket_id
        and f.chemin = objects.name
        and f.organisation_id in (select public.mes_organisations())
    )
  );

-- 3. Le relevé. Rejouable sans effet (on conflict do nothing) ; le Module
-- 50 le rejoue pour attraper les fichiers envoyés entre-temps par une
-- ancienne version de l'application. Ne touche à aucun fichier. Renvoie
-- le nombre de chemins ajoutés.
create or replace function remplir_fichiers_historiques()
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_ajoutes integer;
begin
  with references_fichiers as (
    select 'photos'::text as bucket_id, e #>> '{}' as chemin, d.organisation_id
      from demandes d,
           jsonb_array_elements(case when jsonb_typeof(d.photos) = 'array' then d.photos else '[]'::jsonb end) e
     where jsonb_typeof(e) = 'string'
    union all
    select 'photos', e #>> '{}', dv.organisation_id
      from devis dv,
           jsonb_array_elements(case when jsonb_typeof(dv.photos_incluses) = 'array' then dv.photos_incluses else '[]'::jsonb end) e
     where jsonb_typeof(e) = 'string'
    union all
    select 'photos', p.image_path, p.organisation_id
      from partages_entrants p
     where p.image_path is not null
    union all
    select 'photos', e #>> '{}', p.organisation_id
      from partages_entrants p,
           jsonb_array_elements(case when jsonb_typeof(p.images) = 'array' then p.images else '[]'::jsonb end) e
     where jsonb_typeof(e) = 'string'
    union all
    select 'logos', pe.logo_url, pe.organisation_id
      from parametres_entreprise pe
     where pe.logo_url is not null and pe.logo_url !~* '^https?://'
  )
  insert into fichiers_historiques (bucket_id, chemin, organisation_id)
  select distinct on (bucket_id, chemin) bucket_id, chemin, organisation_id
    from references_fichiers
   where chemin is not null and btrim(chemin) <> ''
   order by bucket_id, chemin, organisation_id
  on conflict (bucket_id, chemin) do nothing;

  get diagnostics v_ajoutes = row_count;
  return v_ajoutes;
end;
$$;

-- Réservée à l'éditeur SQL (et aux migrations).
revoke execute on function remplir_fichiers_historiques() from public, anon, authenticated;

select remplir_fichiers_historiques();
