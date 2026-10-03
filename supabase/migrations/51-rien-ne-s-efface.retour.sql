-- ============================================================
-- Retour arrière du Module 51 — remet les règles « for all » du Module
-- 14, la suppression des devis du Module 22, et les clés en CASCADE.
-- La faille F3 revient (des factures peuvent partir en cascade).
-- Rejouable.
-- ============================================================

drop policy if exists "un membre lit les demandes de son organisation" on demandes;
drop policy if exists "un membre crée des demandes pour son organisation" on demandes;
drop policy if exists "un membre met à jour les demandes de son organisation" on demandes;
drop policy if exists "un membre gère les demandes de son organisation" on demandes;
create policy "un membre gère les demandes de son organisation"
  on demandes for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un membre lit les paramètres de son organisation" on parametres_entreprise;
drop policy if exists "un membre crée les paramètres de son organisation" on parametres_entreprise;
drop policy if exists "un membre met à jour les paramètres de son organisation" on parametres_entreprise;
drop policy if exists "un membre gère les paramètres de son organisation" on parametres_entreprise;
create policy "un membre gère les paramètres de son organisation"
  on parametres_entreprise for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un membre supprime les devis de son organisation" on devis;
create policy "un membre supprime les devis de son organisation"
  on devis for delete
  using (organisation_id in (select mes_organisations()));

drop policy if exists "un membre lit le journal de son organisation" on evenements_projet;
drop policy if exists "un membre ajoute au journal de son organisation" on evenements_projet;
drop policy if exists "un membre gère les événements de projet de son organisation" on evenements_projet;
create policy "un membre gère les événements de projet de son organisation"
  on evenements_projet for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

do $$
declare
  c record;
begin
  for c in
    select con.conname,
           rel.relname as table_source,
           att.attname as colonne,
           frel.relname as table_cible,
           fatt.attname as colonne_cible
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
      join pg_class frel on frel.oid = con.confrelid
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
      join pg_attribute fatt on fatt.attrelid = con.confrelid and fatt.attnum = con.confkey[1]
     where con.contype = 'f'
       and ns.nspname = 'public'
       and array_length(con.conkey, 1) = 1
       and con.confdeltype = 'a'
       and (
         (frel.relname = 'profils' and att.attname = 'artisan_id'
          and rel.relname in ('demandes', 'devis', 'factures', 'notes', 'notes_vocales',
                              'evenements_planning', 'evenements_projet', 'partages_entrants',
                              'parametres_entreprise'))
         or (frel.relname = 'demandes' and att.attname = 'demande_id'
             and rel.relname in ('factures', 'devis'))
       )
  loop
    execute format('alter table public.%I drop constraint %I', c.table_source, c.conname);
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.%I (%I) on delete cascade',
      c.table_source, c.conname, c.colonne, c.table_cible, c.colonne_cible);
  end loop;
end $$;
