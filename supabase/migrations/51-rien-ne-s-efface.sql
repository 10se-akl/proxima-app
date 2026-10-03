-- ============================================================
-- Module 51 (refonte, duel A, 03/10) — Rien ne s'efface.
-- TEMPS 2 (resserrement) : après la mise en production du nouveau code,
-- un autre jour que le Module 50, banc d'isolation rejoué : 0 ÉCHEC.
--
-- POURQUOI (F3). Une facture émise ne se supprime jamais (aucune policy
-- de suppression, Module 28). Mais elle partait quand même en cascade :
--   - par son projet : factures.demande_id → demandes ON DELETE CASCADE,
--     et n'importe quel membre pouvait supprimer un projet (policy
--     « for all ») par un simple appel direct ;
--   - par son auteur : artisan_id → profils ON DELETE CASCADE, et
--     profils → auth.users ON DELETE CASCADE : supprimer le compte d'un
--     ancien salarié effaçait ses projets, ses devis, SES FACTURES, ses
--     notes, ses dictées, ses rendez-vous et le journal.
-- Même chose pour un devis signé. Et supprimer puis recréer les
-- paramètres de l'entreprise permettait de contourner la protection de
-- l'IBAN (Module 52).
--
-- CE QUE FAIT CE MODULE.
-- 1. Plus personne ne supprime depuis l'application un projet, un devis,
--    les paramètres de l'entreprise ou une ligne du journal (qui devient
--    « ajout seul »). Aucun écran ne le faisait (vérifié le 03/10).
--    Notes, rendez-vous, clients et dictées restent supprimables.
-- 2. Les clés artisan_id → profils de neuf tables, et demande_id → demandes
--    des factures et des devis, passent de CASCADE à NO ACTION : la base
--    refuse de supprimer un compte ou un projet qui a encore des
--    documents. abonnements_push garde sa cascade.
--    NO ACTION et pas RESTRICT : NO ACTION ne vérifie qu'à la FIN de
--    l'instruction. Supprimer une entreprise entière (organisations, par
--    exemple un compte de test) reste donc possible : la cascade par
--    organisation_id emporte projets, devis et factures dans la même
--    instruction, et la vérification les trouve déjà partis. RESTRICT,
--    lui, refuserait au milieu.
--    Les noms réels des clés ne sont pas certains (bases créées à des
--    moments différents) : le bloc les retrouve dans pg_constraint par
--    leur table et leur colonne. Il est rejouable : une clé déjà en NO
--    ACTION n'est plus retouchée.
--
-- CONSÉQUENCE À CONNAÎTRE : refuser une candidature supprime le compte ;
-- c'est désormais refusé si ce compte a déjà écrit quelque chose (voir la
-- vérification « Avant » du guide). Un ancien membre s'anonymise au lieu
-- d'être supprimé (docs/deploiement-equipe.md).
--
-- Rejouable. Retour arrière : supabase/migrations/51-rien-ne-s-efface.retour.sql.
-- ============================================================

-- 1. Les règles d'accès.
drop policy if exists "un membre gère les demandes de son organisation" on demandes;
drop policy if exists "un membre lit les demandes de son organisation" on demandes;
create policy "un membre lit les demandes de son organisation"
  on demandes for select
  using (organisation_id in (select mes_organisations()));
drop policy if exists "un membre crée des demandes pour son organisation" on demandes;
create policy "un membre crée des demandes pour son organisation"
  on demandes for insert
  with check (organisation_id in (select mes_organisations()));
drop policy if exists "un membre met à jour les demandes de son organisation" on demandes;
create policy "un membre met à jour les demandes de son organisation"
  on demandes for update
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un membre gère les paramètres de son organisation" on parametres_entreprise;
drop policy if exists "un membre lit les paramètres de son organisation" on parametres_entreprise;
create policy "un membre lit les paramètres de son organisation"
  on parametres_entreprise for select
  using (organisation_id in (select mes_organisations()));
drop policy if exists "un membre crée les paramètres de son organisation" on parametres_entreprise;
create policy "un membre crée les paramètres de son organisation"
  on parametres_entreprise for insert
  with check (organisation_id in (select mes_organisations()));
drop policy if exists "un membre met à jour les paramètres de son organisation" on parametres_entreprise;
create policy "un membre met à jour les paramètres de son organisation"
  on parametres_entreprise for update
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

drop policy if exists "un membre supprime les devis de son organisation" on devis;

drop policy if exists "un membre gère les événements de projet de son organisation" on evenements_projet;
drop policy if exists "un membre lit le journal de son organisation" on evenements_projet;
create policy "un membre lit le journal de son organisation"
  on evenements_projet for select
  using (organisation_id in (select mes_organisations()));
drop policy if exists "un membre ajoute au journal de son organisation" on evenements_projet;
create policy "un membre ajoute au journal de son organisation"
  on evenements_projet for insert
  with check (organisation_id in (select mes_organisations()));

-- 2. Les clés : CASCADE → NO ACTION.
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
       and con.confdeltype = 'c'
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
      'alter table public.%I add constraint %I foreign key (%I) references public.%I (%I) on delete no action not valid',
      c.table_source, c.conname, c.colonne, c.table_cible, c.colonne_cible);
    execute format('alter table public.%I validate constraint %I', c.table_source, c.conname);
    raise notice 'Clé % (%.%) : CASCADE devient NO ACTION', c.conname, c.table_source, c.colonne;
  end loop;
end $$;
