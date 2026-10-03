-- ============================================================
-- Banc d'isolation des équipes (refonte, duel A, lot 0 — 03/10).
--
-- POURQUOI. Toute la sécurité de Compyo repose sur la RLS de la base :
-- l'interface ne cache rien qui ne soit déjà refusé en base. Les
-- migrations 45 à 52 resserrent ces règles ; une seule policy mal écrite
-- peut ouvrir les données d'une entreprise à une autre, ou casser le
-- travail de l'équipe sans un bruit. Le dépôt n'a aucun test : ce script
-- en tient lieu. Il se rejoue AVANT et APRÈS chaque migration, sur une
-- COPIE de la base (voir docs/deploiement-equipe.md).
--
-- CE QU'IL FAIT. Il crée deux entreprises de test, A et B, joue chaque
-- ligne de la matrice du § 5 de refonte-maquettes/duel-A/arbitrage.md, puis
-- ANNULE TOUT : rien de ce qu'il crée ne reste en base (le bloc principal
-- se termine par une erreur volontaire qui annule ses écritures, et le
-- script entier est dans une transaction terminée par ROLLBACK).
--
-- LES PROFILS.
--   P = propriétaire de A ;
--   E = employé de A (le seul « membre limité » : IBAN et équipe) ;
--   R = retiré de A (sa session est encore valide, sa ligne memberships
--       a été supprimée) ;
--   X = propriétaire de B, qui vise les données de A ;
--   Y = ancien membre de A devenu membre de B (la faille F6b) ;
--   anon = visiteur sans compte ;
--   base = l'éditeur SQL lui-même (vérifications de structure).
--
-- LA LÉGENDE (colonnes « attendu » et « obtenu »).
--   0     = aucune ligne renvoyée ou touchée ;
--   refus = erreur (RLS, droit manquant ou trigger) ;
--   oui   = autorisé, au moins une ligne ;
--   0|refus = l'un ou l'autre convient (rien ne s'est passé).
--
-- LES MODULES. Le script détecte lui-même les migrations déjà passées et
-- ajuste chaque résultat attendu : « m51 » veut dire « le Module 51 est
-- passé ». Une ligne dont le résultat attendu change avec un module le
-- dit dans la colonne « note » ; une faille encore ouverte avant son
-- module est notée « faille connue ». Les lignes « ignoré » visent une
-- table qui n'existe pas encore.
--
-- LIRE LE RÉSULTAT. Le tableau affiché commence par une ligne « BILAN »
-- (nombre d'OK, d'ÉCHEC et d'ignorés, modules détectés), puis les ÉCHEC
-- en premier. Zéro ÉCHEC : la migration peut passer. Un seul ÉCHEC : on
-- s'arrête et on lit la colonne « detail ».
--
-- Le dernier bloc, le « canari », liste toute table de public sans RLS,
-- ou dont une policy ne mentionne ni mes_organisations() ni auth.uid() :
-- toute nouvelle table doit y passer avant sa mise en production.
-- ============================================================

begin;

create temp table resultats_isolation (
  n int,
  profil text,
  objet text,
  action text,
  attendu text,
  obtenu text,
  statut text,
  note text,
  detail text
) on commit drop;

-- Joue UNE requête dans la peau d'un profil, note ce qui s'est passé,
-- puis annule ce que la requête a écrit : chaque essai est indépendant
-- des autres. Pas de « security definer » : la fonction doit tourner avec
-- les droits du profil endossé, sinon elle ne testerait rien.
create function pg_temp.essai(
  p_profil text,
  p_uid uuid,
  p_objet text,
  p_action text,
  p_attendu text,
  p_requete text,
  p_note text default null,
  p_actif boolean default true
) returns resultats_isolation
language plpgsql
as $essai$
declare
  v_n bigint;
  v_obtenu text;
  v_detail text;
  r resultats_isolation;
begin
  if not p_actif then
    r := row(null, p_profil, p_objet, p_action, p_attendu, '—', 'ignoré', p_note,
             'table ou fonction pas encore créée (module pas encore passé)');
    return r;
  end if;

  if p_profil = 'base' then
    null; -- reste dans le rôle de l'éditeur SQL
  elsif p_uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', p_uid::text, true);
    execute 'set local role authenticated';
  end if;
  -- Supabase refuse les suppressions directes dans storage.objects sans ce
  -- réglage : sans lui, chaque essai de suppression d'un fichier
  -- répondrait « refus » pour une raison étrangère à la RLS.
  perform set_config('storage.allow_delete_query', 'true', true);

  begin
    execute p_requete;
    get diagnostics v_n = row_count;
    v_obtenu := case when v_n = 0 then '0' else 'oui' end;
    -- Annule les écritures de l'essai (les variables, elles, restent).
    raise exception using errcode = 'P0001', message = 'compyo:annuler-essai';
  exception when others then
    if sqlerrm <> 'compyo:annuler-essai' then
      v_obtenu := 'refus';
      v_detail := left(sqlerrm, 220);
    end if;
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);

  r := row(null, p_profil, p_objet, p_action, p_attendu, v_obtenu,
           case when v_obtenu = any (string_to_array(p_attendu, '|')) then 'OK' else 'ÉCHEC' end,
           p_note, v_detail);
  return r;
end
$essai$;

do $banc$
declare
  -- Identifiants fixes : lisibles dans le rapport, et sans risque de
  -- collision (tout est annulé à la fin).
  v_org_a constant uuid := '0a000000-0000-4000-8000-000000000000';
  v_org_b constant uuid := '0b000000-0000-4000-8000-000000000000';
  v_p constant uuid := '0a000000-0000-4000-8000-0000000000a1';
  v_e constant uuid := '0a000000-0000-4000-8000-0000000000a2';
  v_r constant uuid := '0a000000-0000-4000-8000-0000000000a3';
  v_x constant uuid := '0b000000-0000-4000-8000-0000000000b1';
  v_y constant uuid := '0b000000-0000-4000-8000-0000000000b2';
  v_dem_a constant uuid := '0a000000-0000-4000-8000-0000000000d1';
  v_dem_b constant uuid := '0b000000-0000-4000-8000-0000000000d1';
  v_dv_brouillon constant uuid := '0a000000-0000-4000-8000-0000000000e1';
  v_dv_envoye constant uuid := '0a000000-0000-4000-8000-0000000000e2';
  v_dv_b constant uuid := '0b000000-0000-4000-8000-0000000000e1';
  v_fac_a constant uuid := '0a000000-0000-4000-8000-0000000000f1';
  v_fac_b constant uuid := '0b000000-0000-4000-8000-0000000000f1';
  v_note_p constant uuid := '0a000000-0000-4000-8000-0000000000c1';
  v_note_e constant uuid := '0a000000-0000-4000-8000-0000000000c2';
  v_note_r constant uuid := '0a000000-0000-4000-8000-0000000000c3';
  v_client_a constant uuid := '0a000000-0000-4000-8000-0000000000b0';
  v_iban_a constant text := 'FR7630006000011234567890189';

  -- Chemins de fichiers (bucket « photos » sauf mention).
  v_neuve_e text;   -- {A}/{E}/{projet}/… : rangée par entreprise (Module 47)
  v_neuve_p text;   -- {A}/{P}/{projet}/…
  v_ancienne_p text; -- {P}/{projet}/… : ancien chemin, par auteur
  v_ancienne_y text; -- {Y}/{projet}/… : envoyée par Y quand il était dans A
  v_logo_a text;    -- bucket « logos » : {A}/logo-…

  -- Les modules déjà passés sur cette base.
  m45 boolean := to_regprocedure('public.est_proprietaire(uuid)') is not null;
  m46 boolean := to_regprocedure('public.imposer_coordonnees_bancaires()') is not null;
  m47 boolean := to_regclass('public.fichiers_historiques') is not null;
  m48 boolean := to_regclass('public.anciens_membres') is not null;
  m49 boolean := to_regclass('public.invitations') is not null;
  m50 boolean := not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'un membre de l''organisation gère les photos de l''équipe');
  m51 boolean := not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'demandes'
      and policyname = 'un membre gère les demandes de son organisation');
  m52 boolean := to_regprocedure('public.proteger_iban()') is not null;

  l resultats_isolation[] := '{}';
  t text;
  raison text;
  nb_canari int := 0;
begin
  v_neuve_e := format('%s/%s/%s/1759400000000-neuve-e.jpg', v_org_a, v_e, v_dem_a);
  v_neuve_p := format('%s/%s/%s/1759400000000-neuve-p.jpg', v_org_a, v_p, v_dem_a);
  v_ancienne_p := format('%s/%s/1700000000000-ancienne.jpg', v_p, v_dem_a);
  v_ancienne_y := format('%s/%s/1700000000000-photo-y.jpg', v_y, v_dem_a);
  v_logo_a := format('%s/logo-1759400000000-a.png', v_org_a);

  begin
    -- ==========================================================
    -- 1. Les données de test (en tant qu'éditeur SQL, sans RLS)
    -- ==========================================================
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      (v_p, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'isolation-p@compyo.invalid', '{"provider":"email","providers":["email"],"acces":"actif"}', '{}', now(), now()),
      (v_e, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'isolation-e@compyo.invalid', '{"provider":"email","providers":["email"],"acces":"actif"}', '{}', now(), now()),
      (v_r, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'isolation-r@compyo.invalid', '{"provider":"email","providers":["email"],"acces":"actif"}', '{}', now(), now()),
      (v_x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'isolation-x@compyo.invalid', '{"provider":"email","providers":["email"],"acces":"actif"}', '{}', now(), now()),
      (v_y, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'isolation-y@compyo.invalid', '{"provider":"email","providers":["email"],"acces":"actif"}', '{}', now(), now());

    insert into profils (id, nom, metier, email) values
      (v_p, 'Gérard Essai', 'platrier', 'isolation-p@compyo.invalid'),
      (v_e, 'Sophie Essai', 'platrier', 'isolation-e@compyo.invalid'),
      (v_r, 'Pierre Essai', 'platrier', 'isolation-r@compyo.invalid'),
      (v_x, 'Xavier Essai', 'plombier', 'isolation-x@compyo.invalid'),
      (v_y, 'Yann Essai', 'plombier', 'isolation-y@compyo.invalid');

    insert into organisations (id, nom, cree_par) values
      (v_org_a, 'Entreprise A (essai)', v_p),
      (v_org_b, 'Entreprise B (essai)', v_x);

    insert into memberships (organisation_id, user_id, role) values
      (v_org_a, v_p, 'proprietaire'),
      (v_org_a, v_e, 'employe'),
      (v_org_a, v_r, 'employe'),
      (v_org_b, v_x, 'proprietaire'),
      (v_org_b, v_y, 'employe');

    insert into parametres_entreprise (organisation_id, artisan_id, nom_entreprise, iban, bic) values
      (v_org_a, v_p, 'Entreprise A (essai)', v_iban_a, null),
      (v_org_b, v_x, 'Entreprise B (essai)', 'FR7610000000000000000000000', null);

    insert into demandes (id, organisation_id, artisan_id, nom_client, description, statut, photos) values
      (v_dem_a, v_org_a, v_p, 'Client de A', 'Projet de test A', 'devis_envoye',
        jsonb_build_array(v_neuve_p, v_ancienne_p, v_ancienne_y)),
      (v_dem_b, v_org_b, v_x, 'Client de B', 'Projet de test B', 'devis_envoye', '[]');

    insert into devis (id, demande_id, artisan_id, organisation_id, numero, lignes, total_estime, statut) values
      (v_dv_brouillon, v_dem_a, v_p, v_org_a, 'ISO-D-001', '[]', 100, 'brouillon');
    insert into devis (id, demande_id, artisan_id, organisation_id, numero, lignes, total_estime, montant_tva, statut, envoye_le, mentions_legales) values
      (v_dv_envoye, v_dem_a, v_p, v_org_a, 'ISO-D-002', '[]', 120, 20, 'envoye', now(),
        jsonb_build_object('nom_entreprise', 'Entreprise A (essai)', 'iban', v_iban_a)),
      (v_dv_b, v_dem_b, v_x, v_org_b, 'ISO-D-001', '[]', 120, 20, 'envoye', now(),
        jsonb_build_object('nom_entreprise', 'Entreprise B (essai)'));

    insert into factures (id, organisation_id, demande_id, devis_id, artisan_id, type, numero, lignes, sous_total_ht, tva_pct, montant_tva, total_ttc, mentions_legales) values
      (v_fac_a, v_org_a, v_dem_a, v_dv_envoye, v_p, 'facture', 'ISO-F-001', '[]', 100, 20, 20, 120,
        jsonb_build_object('nom_entreprise', 'Entreprise A (essai)', 'iban', v_iban_a)),
      (v_fac_b, v_org_b, v_dem_b, v_dv_b, v_x, 'facture', 'ISO-F-001', '[]', 100, 20, 20, 120,
        jsonb_build_object('nom_entreprise', 'Entreprise B (essai)'));

    insert into clients (id, organisation_id, nom) values (v_client_a, v_org_a, 'Client de A');

    insert into notes (id, organisation_id, artisan_id, demande_id, titre) values
      (v_note_p, v_org_a, v_p, v_dem_a, 'Note de P'),
      (v_note_e, v_org_a, v_e, v_dem_a, 'Note de E'),
      (v_note_r, v_org_a, v_r, v_dem_a, 'Note de R, écrite quand il était membre');

    insert into notes_vocales (demande_id, organisation_id, artisan_id, transcription)
      values (v_dem_a, v_org_a, v_p, 'Dictée de test');
    insert into evenements_planning (organisation_id, artisan_id, titre, type, date_heure)
      values (v_org_a, v_p, 'Tâche de test', 'tache', now() + interval '1 day');
    insert into evenements_projet (demande_id, organisation_id, artisan_id, type, titre)
      values (v_dem_a, v_org_a, v_p, 'projet_cree', 'Projet créé (essai)');

    insert into abonnements_push (organisation_id, artisan_id, endpoint, cle_p256dh, cle_auth) values
      (v_org_a, v_p, 'https://push.invalid/isolation-p', 'cle', 'auth'),
      (v_org_a, v_e, 'https://push.invalid/isolation-e', 'cle', 'auth'),
      (v_org_a, v_r, 'https://push.invalid/isolation-r', 'cle', 'auth');

    insert into partages_entrants (organisation_id, artisan_id, texte) values
      (v_org_a, v_p, 'Partage de P'),
      (v_org_a, v_e, 'Partage de E'),
      (v_org_a, v_r, 'Partage de R, reçu quand il était membre');

    if m47 then
      insert into fichiers_historiques (bucket_id, chemin, organisation_id) values
        ('photos', v_ancienne_p, v_org_a),
        ('photos', v_ancienne_y, v_org_a);
    end if;
    if m49 then
      insert into invitations (organisation_id, email, prenom, invite_par)
        values (v_org_a, 'isolation-invitee@compyo.invalid', 'Invitée Essai', v_p);
    end if;

    -- Les fichiers : le rôle service_role contourne la RLS du stockage
    -- (l'éditeur SQL n'est pas propriétaire de storage.objects).
    execute 'set local role service_role';
    insert into storage.objects (bucket_id, name) values
      ('photos', v_neuve_e),
      ('photos', v_neuve_p),
      ('photos', v_ancienne_p),
      ('photos', v_ancienne_y),
      ('logos', v_logo_a);
    execute 'reset role';

    -- R quitte l'équipe : avec le Module 48, la base garde son nom et
    -- purge ses abonnements push.
    delete from memberships where user_id = v_r;

    -- ==========================================================
    -- 2. X, membre de B, vise les données de A
    -- ==========================================================
    -- X lit les projets de A : 0
    l := l || pg_temp.essai('X', v_x, 'demandes', 'lire', '0',
      format('select 1 from demandes where organisation_id = %L', v_org_a));
    -- X crée un projet dans A : refus
    l := l || pg_temp.essai('X', v_x, 'demandes', 'écrire', 'refus',
      format('insert into demandes (organisation_id, artisan_id, nom_client, description) values (%L, %L, %L, %L)', v_org_a, v_x, 'intrus', 'intrus'));
    -- X modifie un projet de A : 0
    l := l || pg_temp.essai('X', v_x, 'demandes', 'modifier', '0',
      format('update demandes set description = %L where organisation_id = %L', 'intrus', v_org_a));
    -- X supprime les projets de A : 0
    l := l || pg_temp.essai('X', v_x, 'demandes', 'supprimer', '0',
      format('delete from demandes where organisation_id = %L', v_org_a));
    -- X lit / modifie / supprime les devis de A : 0 / 0 / 0
    l := l || pg_temp.essai('X', v_x, 'devis', 'lire', '0',
      format('select 1 from devis where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'devis', 'modifier', '0',
      format('update devis set commentaires = %L where organisation_id = %L', 'intrus', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'devis', 'supprimer', '0',
      format('delete from devis where organisation_id = %L', v_org_a));
    -- X lit les factures de A : 0 ; en crée une dans A : refus
    l := l || pg_temp.essai('X', v_x, 'factures', 'lire', '0',
      format('select 1 from factures where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'factures', 'écrire', 'refus',
      format('insert into factures (organisation_id, demande_id, artisan_id, type, numero, lignes, sous_total_ht, tva_pct, montant_tva, total_ttc, mentions_legales) values (%L, %L, %L, %L, %L, %L, 0, 20, 0, 0, %L)',
        v_org_a, v_dem_a, v_x, 'acompte', 'ISO-X-001', '[]', '{}'));
    -- X tire un numéro de facture de A : refus (Module 45 ; faille F5 avant)
    l := l || pg_temp.essai('X', v_x, 'prochain_numero_facture(A)', 'appeler',
      case when m45 then 'refus' else 'oui' end,
      format('select public.prochain_numero_facture(%L, 2099)', v_org_a),
      case when m45 then 'm45' else 'faille connue F5, fermée par 45' end);
    -- X lit / modifie / crée les paramètres de A : 0 / 0 / refus
    l := l || pg_temp.essai('X', v_x, 'parametres_entreprise', 'lire', '0',
      format('select 1 from parametres_entreprise where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'parametres_entreprise', 'modifier', '0',
      format('update parametres_entreprise set iban = %L where organisation_id = %L', 'FR76FRAUDE', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'parametres_entreprise', 'écrire', 'refus',
      format('insert into parametres_entreprise (organisation_id, artisan_id) values (%L, %L)', v_org_a, v_x));
    -- X lit / écrit / supprime clients, notes, dictées, planning, journal de A
    l := l || pg_temp.essai('X', v_x, 'clients', 'lire', '0',
      format('select 1 from clients where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'clients', 'écrire', 'refus',
      format('insert into clients (organisation_id, nom) values (%L, %L)', v_org_a, 'intrus'));
    l := l || pg_temp.essai('X', v_x, 'clients', 'supprimer', '0',
      format('delete from clients where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'notes', 'lire', '0',
      format('select 1 from notes where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'notes', 'écrire', 'refus',
      format('insert into notes (organisation_id, artisan_id, titre) values (%L, %L, %L)', v_org_a, v_x, 'intrus'));
    l := l || pg_temp.essai('X', v_x, 'notes', 'supprimer', '0',
      format('delete from notes where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'notes_vocales', 'lire', '0',
      format('select 1 from notes_vocales where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'notes_vocales', 'écrire', 'refus',
      format('insert into notes_vocales (demande_id, organisation_id, artisan_id, transcription) values (%L, %L, %L, %L)', v_dem_a, v_org_a, v_x, 'intrus'));
    l := l || pg_temp.essai('X', v_x, 'evenements_planning', 'lire', '0',
      format('select 1 from evenements_planning where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'evenements_planning', 'écrire', 'refus',
      format('insert into evenements_planning (organisation_id, artisan_id, titre, type, date_heure) values (%L, %L, %L, %L, now())', v_org_a, v_x, 'intrus', 'tache'));
    l := l || pg_temp.essai('X', v_x, 'evenements_planning', 'supprimer', '0',
      format('delete from evenements_planning where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'evenements_projet', 'lire', '0',
      format('select 1 from evenements_projet where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'evenements_projet', 'écrire', 'refus',
      format('insert into evenements_projet (demande_id, organisation_id, artisan_id, type, titre) values (%L, %L, %L, %L, %L)', v_dem_a, v_org_a, v_x, 'note', 'intrus'));
    -- X lit les abonnements push et les partages de A : 0 / 0
    l := l || pg_temp.essai('X', v_x, 'abonnements_push', 'lire', '0',
      format('select 1 from abonnements_push where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'partages_entrants', 'lire', '0',
      format('select 1 from partages_entrants where organisation_id = %L', v_org_a));
    -- X lit le profil de P : 0
    l := l || pg_temp.essai('X', v_x, 'profils', 'lire', '0',
      format('select 1 from profils where id = %L', v_p));
    -- X lit l'équipe de A : 0 ; s'y ajoute : refus ; en retire P : rien
    l := l || pg_temp.essai('X', v_x, 'memberships', 'lire', '0',
      format('select 1 from memberships where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'memberships', 'écrire', 'refus',
      format('insert into memberships (organisation_id, user_id, role) values (%L, %L, %L)', v_org_a, v_r, 'employe'));
    l := l || pg_temp.essai('X', v_x, 'memberships', 'supprimer', '0|refus',
      format('delete from memberships where organisation_id = %L', v_org_a));
    -- X lit / renomme l'organisation A : 0 / rien
    l := l || pg_temp.essai('X', v_x, 'organisations', 'lire', '0',
      format('select 1 from organisations where id = %L', v_org_a));
    l := l || pg_temp.essai('X', v_x, 'organisations', 'modifier', '0|refus',
      format('update organisations set nom = %L where id = %L', 'intrus', v_org_a));
    -- X lit les invitations, anciens membres et anciens fichiers de A : 0
    l := l || pg_temp.essai('X', v_x, 'invitations', 'lire', '0',
      format('select 1 from invitations where organisation_id = %L', v_org_a), 'm49', m49);
    l := l || pg_temp.essai('X', v_x, 'anciens_membres', 'lire', '0',
      format('select 1 from anciens_membres where organisation_id = %L', v_org_a), 'm48', m48);
    l := l || pg_temp.essai('X', v_x, 'fichiers_historiques', 'lire', '0',
      format('select 1 from fichiers_historiques where organisation_id = %L', v_org_a), 'm47', m47);
    -- X écrit un journal au nom de A : refus
    l := l || pg_temp.essai('X', v_x, 'logs', 'écrire', 'refus',
      format('insert into logs (organisation_id, artisan_id, type) values (%L, %L, %L)', v_org_a, v_x, 'intrus'));
    -- Stockage {A}/… : X lit 0, écrit refus, supprime 0
    l := l || pg_temp.essai('X', v_x, 'stockage {A}/…', 'lire', '0',
      format('select 1 from storage.objects where bucket_id in (%L, %L) and name like %L', 'photos', 'logos', v_org_a || '/%'));
    l := l || pg_temp.essai('X', v_x, 'stockage {A}/…', 'écrire', 'refus',
      format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'photos', format('%s/%s/intrus.jpg', v_org_a, v_x)));
    l := l || pg_temp.essai('X', v_x, 'stockage {A}/…', 'supprimer', '0',
      format('delete from storage.objects where bucket_id = %L and name = %L', 'photos', v_neuve_p));
    -- Stockage ancien {P}/… : X lit 0
    l := l || pg_temp.essai('X', v_x, 'stockage ancien {P}/…', 'lire', '0',
      format('select 1 from storage.objects where bucket_id = %L and name = %L', 'photos', v_ancienne_p));
    -- Stockage ancien {Y}/… (Y a quitté A pour B) : X lit 0 après 50 ;
    -- avant, c'est la faille F6b (fuite entre entreprises).
    l := l || pg_temp.essai('X', v_x, 'stockage ancien {Y}/…', 'lire',
      case when m50 then '0' else 'oui' end,
      format('select 1 from storage.objects where bucket_id = %L and name = %L', 'photos', v_ancienne_y),
      case when m50 then 'm50' else 'faille connue F6b, fermée par 50' end);
    -- X crée un thème de la carte publique en direct : refus (45 ; F12 avant)
    l := l || pg_temp.essai('X', v_x, 'creer_theme_produit_libre', 'appeler',
      case when m45 then 'refus' else 'oui' end,
      'select public.creer_theme_produit_libre(''essai'', ''Thème essai isolation'', null, null)',
      case when m45 then 'm45' else 'faille connue F12, fermée par 45' end);
    -- X signe en direct un devis de A avec une IP inventée : refus (52 ; F11 avant)
    l := l || pg_temp.essai('X', v_x, 'repondre_devis_public', 'appeler',
      case when m52 then 'refus' else 'oui' end,
      format('select public.repondre_devis_public(%L, %L, null, null, %L, %L)', v_dv_envoye, 'refuse', '1.2.3.4', 'faux'),
      case when m52 then 'm52' else 'faille connue F11, fermée par 52' end);

    -- ==========================================================
    -- 3. E, employé de A
    -- ==========================================================
    -- E lit les projets de A : oui
    l := l || pg_temp.essai('E', v_e, 'demandes', 'lire', 'oui',
      format('select 1 from demandes where id = %L', v_dem_a));
    -- E crée un projet : oui
    l := l || pg_temp.essai('E', v_e, 'demandes', 'écrire', 'oui',
      format('insert into demandes (organisation_id, artisan_id, nom_client, description) values (%L, %L, %L, %L)', v_org_a, v_e, 'Nouveau client', 'Nouveau projet'));
    -- E crée un projet « au nom de P » : la base l'enregistre au nom de E (48)
    l := l || pg_temp.essai('E', v_e, 'demandes', 'auteur forcé', case when m48 then 'oui' else '0' end,
      format('with i as (insert into demandes (organisation_id, artisan_id, nom_client, description) values (%L, %L, %L, %L) returning artisan_id) select 1 from i where artisan_id = %L',
        v_org_a, v_p, 'Client', 'Projet au nom de P', v_e),
      case when m48 then 'm48' else 'faille connue : auteur usurpable avant 48' end);
    -- E modifie un projet : oui
    l := l || pg_temp.essai('E', v_e, 'demandes', 'modifier', 'oui',
      format('update demandes set description = %L where id = %L', 'Description modifiée', v_dem_a));
    -- E supprime un projet (et sa facture en cascade) : 0 après 51 (F3 avant)
    l := l || pg_temp.essai('E', v_e, 'demandes', 'supprimer', case when m51 then '0' else 'oui' end,
      format('delete from demandes where id = %L', v_dem_a),
      case when m51 then 'm51' else 'faille connue F3 (la facture part en cascade), fermée par 51' end);
    -- E lit les devis : oui ; modifie un brouillon : oui
    l := l || pg_temp.essai('E', v_e, 'devis', 'lire', 'oui',
      format('select 1 from devis where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'devis', 'modifier un brouillon', 'oui',
      format('update devis set commentaires = %L where id = %L', 'Commentaire', v_dv_brouillon));
    -- E repasse un devis envoyé en brouillon : refus (46 ; F4 avant)
    l := l || pg_temp.essai('E', v_e, 'devis', 'retour en brouillon', case when m46 then 'refus' else 'oui' end,
      format('update devis set statut = %L where id = %L', 'brouillon', v_dv_envoye),
      case when m46 then 'm46' else 'faille connue F4, fermée par 46' end);
    -- E écrit une signature sur un devis envoyé : refus (46 ; F4 avant)
    l := l || pg_temp.essai('E', v_e, 'devis', 'écrire signature_*', case when m46 then 'refus' else 'oui' end,
      format('update devis set signature_nom = %L, signe_le = now(), signature_user_agent = %L where id = %L', 'Faux client', 'faux', v_dv_envoye),
      case when m46 then 'm46' else 'faille connue F4, fermée par 46' end);
    -- E crée un devis déjà « signé » : refus (46)
    l := l || pg_temp.essai('E', v_e, 'devis', 'créer un devis signé', case when m46 then 'refus' else 'oui' end,
      format('insert into devis (demande_id, artisan_id, organisation_id, numero, lignes, total_estime, statut, signature_nom, signe_le) values (%L, %L, %L, %L, %L, 1, %L, %L, now())',
        v_dem_a, v_e, v_org_a, 'ISO-D-090', '[]', 'envoye', 'Faux client'),
      case when m46 then 'm46' else 'faille connue F4, fermée par 46' end);
    -- E fige un devis avec un IBAN inventé : la base y met l'IBAN des paramètres (46)
    l := l || pg_temp.essai('E', v_e, 'devis', 'IBAN figé = paramètres', case when m46 then 'oui' else '0' end,
      format('with u as (update devis set statut = %L, envoye_le = now(), mentions_legales = %L::jsonb where id = %L returning mentions_legales) select 1 from u where mentions_legales->>%L = %L',
        'envoye', '{"iban":"FR76FRAUDE"}', v_dv_brouillon, 'iban', v_iban_a),
      case when m46 then 'm46' else 'faille connue F9 (IBAN forgé dans le devis), fermée par 46' end);
    -- E supprime un devis : 0 après 51
    l := l || pg_temp.essai('E', v_e, 'devis', 'supprimer', case when m51 then '0' else 'oui' end,
      format('delete from devis where id = %L', v_dv_envoye),
      case when m51 then 'm51' else 'faille connue F3, fermée par 51' end);
    -- E lit les factures : oui ; en crée une : oui
    l := l || pg_temp.essai('E', v_e, 'factures', 'lire', 'oui',
      format('select 1 from factures where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'factures', 'écrire', 'oui',
      format('insert into factures (organisation_id, demande_id, devis_id, artisan_id, type, numero, lignes, sous_total_ht, tva_pct, montant_tva, total_ttc, mentions_legales) values (%L, %L, %L, %L, %L, %L, %L, 30, 20, 6, 36, %L)',
        v_org_a, v_dem_a, v_dv_envoye, v_e, 'acompte', 'ISO-F-010', '[]', '{"nom_entreprise":"Entreprise A (essai)"}'));
    -- E crée une facture avec un IBAN inventé : la base y met l'IBAN des paramètres (46)
    l := l || pg_temp.essai('E', v_e, 'factures', 'IBAN figé = paramètres', case when m46 then 'oui' else '0' end,
      format('with i as (insert into factures (organisation_id, demande_id, devis_id, artisan_id, type, numero, lignes, sous_total_ht, tva_pct, montant_tva, total_ttc, mentions_legales) values (%L, %L, %L, %L, %L, %L, %L, 30, 20, 6, 36, %L) returning mentions_legales) select 1 from i where mentions_legales->>%L = %L',
        v_org_a, v_dem_a, v_dv_envoye, v_e, 'acompte', 'ISO-F-011', '[]', '{"iban":"FR76FRAUDE"}', 'iban', v_iban_a),
      case when m46 then 'm46' else 'faille connue F9 (IBAN forgé dans la facture), fermée par 46' end);
    -- E modifie le contenu d'une facture émise : refus (verrou existant)
    l := l || pg_temp.essai('E', v_e, 'factures', 'modifier le contenu', 'refus',
      format('update factures set total_ttc = 1 where id = %L', v_fac_a));
    -- E supprime une facture : 0 (aucune policy de suppression)
    l := l || pg_temp.essai('E', v_e, 'factures', 'supprimer', '0',
      format('delete from factures where id = %L', v_fac_a));
    -- E tire un numéro de facture de A : oui ; de B : refus (45)
    l := l || pg_temp.essai('E', v_e, 'prochain_numero_facture(A)', 'appeler', 'oui',
      format('select public.prochain_numero_facture(%L, 2099)', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'prochain_numero_facture(B)', 'appeler', case when m45 then 'refus' else 'oui' end,
      format('select public.prochain_numero_facture(%L, 2099)', v_org_b),
      case when m45 then 'm45' else 'faille connue F5, fermée par 45' end);
    -- E lit les paramètres : oui ; change un tarif : oui
    l := l || pg_temp.essai('E', v_e, 'parametres_entreprise', 'lire', 'oui',
      format('select 1 from parametres_entreprise where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'parametres_entreprise', 'modifier un tarif', 'oui',
      format('update parametres_entreprise set cout_horaire = 50 where organisation_id = %L', v_org_a));
    -- E change l'IBAN déjà saisi : refus (52 ; F9 avant)
    l := l || pg_temp.essai('E', v_e, 'parametres_entreprise', 'changer l''IBAN saisi', case when m52 then 'refus' else 'oui' end,
      format('update parametres_entreprise set iban = %L where organisation_id = %L', 'FR76FRAUDE', v_org_a),
      case when m52 then 'm52' else 'faille connue F9, fermée par 52' end);
    -- E saisit un BIC encore vide : oui
    l := l || pg_temp.essai('E', v_e, 'parametres_entreprise', 'saisir le BIC vide', 'oui',
      format('update parametres_entreprise set bic = %L where organisation_id = %L', 'AGRIFRPP', v_org_a));
    -- E supprime les paramètres (pour les recréer avec son IBAN) : 0 après 51
    l := l || pg_temp.essai('E', v_e, 'parametres_entreprise', 'supprimer', case when m51 then '0' else 'oui' end,
      format('delete from parametres_entreprise where organisation_id = %L', v_org_a),
      case when m51 then 'm51' else 'faille connue F9 (supprimer puis recréer), fermée par 51' end);
    -- E : clients oui / oui / oui
    l := l || pg_temp.essai('E', v_e, 'clients', 'lire', 'oui',
      format('select 1 from clients where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'clients', 'écrire', 'oui',
      format('insert into clients (organisation_id, nom) values (%L, %L)', v_org_a, 'Nouveau client'));
    l := l || pg_temp.essai('E', v_e, 'clients', 'supprimer', 'oui',
      format('delete from clients where id = %L', v_client_a));
    -- E : notes oui ; note « au nom de P » enregistrée au nom de E (48) ; supprimer la sienne oui
    l := l || pg_temp.essai('E', v_e, 'notes', 'lire', 'oui',
      format('select 1 from notes where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'notes', 'auteur forcé', case when m48 then 'oui' else '0' end,
      format('with i as (insert into notes (organisation_id, artisan_id, titre) values (%L, %L, %L) returning artisan_id) select 1 from i where artisan_id = %L',
        v_org_a, v_p, 'Note au nom de P', v_e),
      case when m48 then 'm48' else 'faille connue : auteur usurpable avant 48' end);
    l := l || pg_temp.essai('E', v_e, 'notes', 'modifier l''auteur', case when m48 then '0' else 'oui' end,
      format('with u as (update notes set artisan_id = %L where id = %L returning artisan_id) select 1 from u where artisan_id = %L', v_e, v_note_p, v_e),
      case when m48 then 'm48 (l''auteur reste P)' else 'faille connue : auteur réécrit avant 48' end);
    l := l || pg_temp.essai('E', v_e, 'notes', 'supprimer', 'oui',
      format('delete from notes where id = %L', v_note_e));
    -- E : dictées et planning oui
    l := l || pg_temp.essai('E', v_e, 'notes_vocales', 'lire', 'oui',
      format('select 1 from notes_vocales where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'notes_vocales', 'écrire', 'oui',
      format('insert into notes_vocales (demande_id, organisation_id, artisan_id, transcription) values (%L, %L, %L, %L)', v_dem_a, v_org_a, v_e, 'Dictée'));
    l := l || pg_temp.essai('E', v_e, 'evenements_planning', 'lire', 'oui',
      format('select 1 from evenements_planning where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'evenements_planning', 'écrire', 'oui',
      format('insert into evenements_planning (organisation_id, artisan_id, titre, type, date_heure) values (%L, %L, %L, %L, now())', v_org_a, v_e, 'Tâche', 'tache'));
    l := l || pg_temp.essai('E', v_e, 'evenements_planning', 'supprimer', 'oui',
      format('delete from evenements_planning where organisation_id = %L', v_org_a));
    -- E : journal du projet, ajout oui ; modification et suppression 0 après 51
    l := l || pg_temp.essai('E', v_e, 'evenements_projet', 'lire', 'oui',
      format('select 1 from evenements_projet where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'evenements_projet', 'ajouter', 'oui',
      format('insert into evenements_projet (demande_id, organisation_id, artisan_id, type, titre) values (%L, %L, %L, %L, %L)', v_dem_a, v_org_a, v_e, 'note', 'Ajout'));
    l := l || pg_temp.essai('E', v_e, 'evenements_projet', 'modifier', case when m51 then '0' else 'oui' end,
      format('update evenements_projet set titre = %L where organisation_id = %L', 'Réécrit', v_org_a),
      case when m51 then 'm51' else 'avant 51 : le journal est modifiable' end);
    l := l || pg_temp.essai('E', v_e, 'evenements_projet', 'supprimer', case when m51 then '0' else 'oui' end,
      format('delete from evenements_projet where organisation_id = %L', v_org_a),
      case when m51 then 'm51' else 'avant 51 : le journal est effaçable' end);
    -- E : abonnements push, les siens oui ; ceux de P 0 après 52 (F10 avant)
    l := l || pg_temp.essai('E', v_e, 'abonnements_push', 'lire les siens', 'oui',
      format('select 1 from abonnements_push where artisan_id = %L', v_e));
    l := l || pg_temp.essai('E', v_e, 'abonnements_push', 'lire ceux de P', case when m52 then '0' else 'oui' end,
      format('select 1 from abonnements_push where artisan_id = %L', v_p),
      case when m52 then 'm52' else 'faille connue F10, fermée par 52' end);
    l := l || pg_temp.essai('E', v_e, 'abonnements_push', 'écrire au nom de P', case when m52 then 'refus' else 'oui' end,
      format('insert into abonnements_push (organisation_id, artisan_id, endpoint, cle_p256dh, cle_auth) values (%L, %L, %L, %L, %L)', v_org_a, v_p, 'https://push.invalid/detourne', 'c', 'a'),
      case when m52 then 'm52 : seule la route serveur écrit' else 'faille connue F10, fermée par 52' end);
    l := l || pg_temp.essai('E', v_e, 'abonnements_push', 'supprimer les siens', 'oui',
      format('delete from abonnements_push where artisan_id = %L', v_e));
    -- E : partages entrants, les siens oui ; ceux de P 0
    l := l || pg_temp.essai('E', v_e, 'partages_entrants', 'lire les siens', 'oui',
      format('select 1 from partages_entrants where artisan_id = %L', v_e));
    l := l || pg_temp.essai('E', v_e, 'partages_entrants', 'lire ceux de P', '0',
      format('select 1 from partages_entrants where artisan_id = %L', v_p));
    -- E : profils, lit P oui ; modifie P 0 ; modifie le sien oui
    l := l || pg_temp.essai('E', v_e, 'profils', 'lire P', 'oui',
      format('select 1 from profils where id = %L', v_p));
    l := l || pg_temp.essai('E', v_e, 'profils', 'modifier P', '0',
      format('update profils set nom = %L where id = %L', 'Pirate', v_p));
    l := l || pg_temp.essai('E', v_e, 'profils', 'modifier le sien', 'oui',
      format('update profils set nom = %L where id = %L', 'Sophie E.', v_e));
    -- E : équipe, lit oui ; s'y ajoute refus ; se donne la main 0 ; retire P 0
    l := l || pg_temp.essai('E', v_e, 'memberships', 'lire', 'oui',
      format('select 1 from memberships where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'memberships', 'écrire', 'refus',
      format('insert into memberships (organisation_id, user_id, role) values (%L, %L, %L)', v_org_a, v_r, 'employe'));
    l := l || pg_temp.essai('E', v_e, 'memberships', 'se nommer propriétaire', '0|refus',
      format('update memberships set role = %L where user_id = %L', 'proprietaire', v_e));
    l := l || pg_temp.essai('E', v_e, 'memberships', 'retirer P', '0|refus',
      format('delete from memberships where user_id = %L', v_p));
    l := l || pg_temp.essai('E', v_e, 'organisations', 'lire', 'oui',
      format('select 1 from organisations where id = %L', v_org_a));
    l := l || pg_temp.essai('E', v_e, 'organisations', 'modifier', '0|refus',
      format('update organisations set nom = %L where id = %L', 'Renommée', v_org_a));
    -- E : invitations, anciens membres, anciens fichiers : lit oui, écrit refus
    l := l || pg_temp.essai('E', v_e, 'invitations', 'lire', 'oui',
      format('select 1 from invitations where organisation_id = %L', v_org_a), 'm49', m49);
    l := l || pg_temp.essai('E', v_e, 'invitations', 'écrire', 'refus',
      format('insert into invitations (organisation_id, email, prenom) values (%L, %L, %L)', v_org_a, 'x@compyo.invalid', 'X'), 'm49', m49);
    l := l || pg_temp.essai('E', v_e, 'anciens_membres', 'lire', 'oui',
      format('select 1 from anciens_membres where organisation_id = %L and user_id = %L', v_org_a, v_r), 'm48', m48);
    l := l || pg_temp.essai('E', v_e, 'anciens_membres', 'écrire', 'refus',
      format('insert into anciens_membres (organisation_id, user_id, nom) values (%L, %L, %L)', v_org_a, v_y, 'Faux'), 'm48', m48);
    l := l || pg_temp.essai('E', v_e, 'fichiers_historiques', 'lire', 'oui',
      format('select 1 from fichiers_historiques where organisation_id = %L', v_org_a), 'm47', m47);
    l := l || pg_temp.essai('E', v_e, 'fichiers_historiques', 'écrire', 'refus',
      format('insert into fichiers_historiques (bucket_id, chemin, organisation_id) values (%L, %L, %L)', 'photos', format('%s/vol.jpg', v_x), v_org_a), 'm47', m47);
    -- E : journal technique, écrit oui, lit 0 (lecture admin seulement)
    l := l || pg_temp.essai('E', v_e, 'logs', 'écrire', 'oui',
      format('insert into logs (organisation_id, artisan_id, type) values (%L, %L, %L)', v_org_a, v_e, 'essai'));
    l := l || pg_temp.essai('E', v_e, 'logs', 'lire', '0',
      format('select 1 from logs where organisation_id = %L', v_org_a));
    -- Stockage {A}/… : E lit oui, écrit sous son nom oui, sous le nom de P refus, supprime oui (47)
    l := l || pg_temp.essai('E', v_e, 'stockage {A}/…', 'lire', case when m47 then 'oui' else '0' end,
      format('select 1 from storage.objects where bucket_id = %L and name = %L', 'photos', v_neuve_p), 'm47', true);
    l := l || pg_temp.essai('E', v_e, 'stockage {A}/…', 'écrire (2e segment = soi)', case when m47 then 'oui' else 'refus' end,
      format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'photos', format('%s/%s/%s/essai.jpg', v_org_a, v_e, v_dem_a)), 'm47', true);
    l := l || pg_temp.essai('E', v_e, 'stockage {A}/…', 'écrire au nom de P', 'refus',
      format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'photos', format('%s/%s/%s/usurpe.jpg', v_org_a, v_p, v_dem_a)));
    l := l || pg_temp.essai('E', v_e, 'stockage {A}/…', 'supprimer', case when m47 then 'oui' else '0' end,
      format('delete from storage.objects where bucket_id = %L and name = %L', 'photos', v_neuve_p), 'm47', true);
    l := l || pg_temp.essai('E', v_e, 'stockage logos {A}/…', 'écrire', case when m47 then 'oui' else 'refus' end,
      format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'logos', format('%s/logo-essai.png', v_org_a)), 'm47', true);
    -- Stockage ancien {P}/… : E lit oui, supprime oui ; écrit un nouveau {E}/… refus après 50
    l := l || pg_temp.essai('E', v_e, 'stockage ancien {P}/…', 'lire', 'oui',
      format('select 1 from storage.objects where bucket_id = %L and name = %L', 'photos', v_ancienne_p));
    l := l || pg_temp.essai('E', v_e, 'stockage ancien {P}/…', 'supprimer', 'oui',
      format('delete from storage.objects where bucket_id = %L and name = %L', 'photos', v_ancienne_p));
    l := l || pg_temp.essai('E', v_e, 'stockage ancien {E}/…', 'écrire', case when m50 then 'refus' else 'oui' end,
      format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'photos', format('%s/%s/essai-ancien.jpg', v_e, v_dem_a)),
      case when m50 then 'm50' else 'ancien chemin encore accepté avant 50' end);
    -- La photo de Y, parti de A : E la voit après 47 (F6a avant : l'équipe la perdait)
    l := l || pg_temp.essai('E', v_e, 'stockage ancien {Y}/…', 'lire', case when m47 then 'oui' else '0' end,
      format('select 1 from storage.objects where bucket_id = %L and name = %L', 'photos', v_ancienne_y),
      case when m47 then 'm47' else 'faille connue F6a, fermée par 47' end);
    -- E est-il propriétaire ? non (45)
    l := l || pg_temp.essai('E', v_e, 'est_proprietaire(A)', 'appeler', '0',
      format('select 1 where public.est_proprietaire(%L)', v_org_a), 'm45', m45);
    -- E : fonctions exposées
    l := l || pg_temp.essai('E', v_e, 'creer_theme_produit_libre', 'appeler', case when m45 then 'refus' else 'oui' end,
      'select public.creer_theme_produit_libre(''essai'', ''Thème essai isolation'', null, null)',
      case when m45 then 'm45' else 'faille connue F12, fermée par 45' end);
    l := l || pg_temp.essai('E', v_e, 'repondre_devis_public', 'appeler', case when m52 then 'refus' else 'oui' end,
      format('select public.repondre_devis_public(%L, %L, null, null, %L, %L)', v_dv_envoye, 'refuse', '1.2.3.4', 'faux'),
      case when m52 then 'm52' else 'faille connue F11, fermée par 52' end);
    -- La réciproque : E ne voit rien de B
    l := l || pg_temp.essai('E', v_e, 'demandes de B', 'lire', '0',
      format('select 1 from demandes where organisation_id = %L', v_org_b));
    l := l || pg_temp.essai('E', v_e, 'factures de B', 'lire', '0',
      format('select 1 from factures where organisation_id = %L', v_org_b));

    -- ==========================================================
    -- 4. P, propriétaire de A
    -- ==========================================================
    -- P change l'IBAN : oui
    l := l || pg_temp.essai('P', v_p, 'parametres_entreprise', 'changer l''IBAN saisi', 'oui',
      format('update parametres_entreprise set iban = %L where organisation_id = %L', 'FR7630004000031234567890143', v_org_a));
    -- P est propriétaire de A : oui (45)
    l := l || pg_temp.essai('P', v_p, 'est_proprietaire(A)', 'appeler', 'oui',
      format('select 1 where public.est_proprietaire(%L)', v_org_a), 'm45', m45);
    -- P lit les abonnements push de E : 0 après 52
    l := l || pg_temp.essai('P', v_p, 'abonnements_push', 'lire ceux de E', case when m52 then '0' else 'oui' end,
      format('select 1 from abonnements_push where artisan_id = %L', v_e),
      case when m52 then 'm52' else 'faille connue F10, fermée par 52' end);
    -- P ne voit pas les partages de E : 0
    l := l || pg_temp.essai('P', v_p, 'partages_entrants', 'lire ceux de E', '0',
      format('select 1 from partages_entrants where artisan_id = %L', v_e));

    -- ==========================================================
    -- 5. R, retiré de A (sa session est encore valide)
    -- ==========================================================
    l := l || pg_temp.essai('R', v_r, 'demandes', 'lire', '0',
      format('select 1 from demandes where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('R', v_r, 'demandes', 'écrire', 'refus',
      format('insert into demandes (organisation_id, artisan_id, nom_client, description) values (%L, %L, %L, %L)', v_org_a, v_r, 'x', 'x'));
    l := l || pg_temp.essai('R', v_r, 'demandes', 'modifier', '0',
      format('update demandes set description = %L where organisation_id = %L', 'x', v_org_a));
    l := l || pg_temp.essai('R', v_r, 'demandes', 'supprimer', '0',
      format('delete from demandes where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('R', v_r, 'devis', 'lire', '0',
      format('select 1 from devis where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('R', v_r, 'factures', 'lire', '0',
      format('select 1 from factures where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('R', v_r, 'parametres_entreprise', 'lire', '0',
      format('select 1 from parametres_entreprise where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('R', v_r, 'notes', 'lire (même la sienne)', '0',
      format('select 1 from notes where id = %L', v_note_r));
    l := l || pg_temp.essai('R', v_r, 'notes', 'écrire', 'refus',
      format('insert into notes (organisation_id, artisan_id, titre) values (%L, %L, %L)', v_org_a, v_r, 'x'));
    l := l || pg_temp.essai('R', v_r, 'prochain_numero_facture(A)', 'appeler', case when m45 then 'refus' else 'oui' end,
      format('select public.prochain_numero_facture(%L, 2099)', v_org_a),
      case when m45 then 'm45' else 'faille connue F5, fermée par 45' end);
    l := l || pg_temp.essai('R', v_r, 'abonnements_push', 'lire les siens', '0',
      format('select 1 from abonnements_push where artisan_id = %L', v_r));
    l := l || pg_temp.essai('R', v_r, 'partages_entrants', 'lire les siens', case when m52 then '0' else 'oui' end,
      format('select 1 from partages_entrants where artisan_id = %L', v_r),
      case when m52 then 'm52' else 'faille connue : un ancien membre garde ses partages, fermée par 52' end);
    l := l || pg_temp.essai('R', v_r, 'profils', 'lire P', '0',
      format('select 1 from profils where id = %L', v_p));
    l := l || pg_temp.essai('R', v_r, 'profils', 'lire le sien', 'oui',
      format('select 1 from profils where id = %L', v_r));
    l := l || pg_temp.essai('R', v_r, 'memberships', 'lire', '0',
      format('select 1 from memberships where organisation_id = %L', v_org_a));
    l := l || pg_temp.essai('R', v_r, 'organisations', 'lire', '0',
      format('select 1 from organisations where id = %L', v_org_a));
    l := l || pg_temp.essai('R', v_r, 'invitations', 'lire', '0',
      format('select 1 from invitations where organisation_id = %L', v_org_a), 'm49', m49);
    l := l || pg_temp.essai('R', v_r, 'anciens_membres', 'lire', '0',
      format('select 1 from anciens_membres where organisation_id = %L', v_org_a), 'm48', m48);
    l := l || pg_temp.essai('R', v_r, 'fichiers_historiques', 'lire', '0',
      format('select 1 from fichiers_historiques where organisation_id = %L', v_org_a), 'm47', m47);
    l := l || pg_temp.essai('R', v_r, 'logs', 'écrire', 'refus',
      format('insert into logs (organisation_id, artisan_id, type) values (%L, %L, %L)', v_org_a, v_r, 'x'));
    l := l || pg_temp.essai('R', v_r, 'stockage {A}/…', 'lire', '0',
      format('select 1 from storage.objects where bucket_id in (%L, %L) and name like %L', 'photos', 'logos', v_org_a || '/%'));
    l := l || pg_temp.essai('R', v_r, 'stockage {A}/…', 'écrire', 'refus',
      format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'photos', format('%s/%s/x.jpg', v_org_a, v_r)));
    l := l || pg_temp.essai('R', v_r, 'stockage {A}/…', 'supprimer', '0',
      format('delete from storage.objects where bucket_id = %L and name = %L', 'photos', v_neuve_e));
    l := l || pg_temp.essai('R', v_r, 'stockage ancien {P}/…', 'lire', '0',
      format('select 1 from storage.objects where bucket_id = %L and name = %L', 'photos', v_ancienne_p));
    l := l || pg_temp.essai('R', v_r, 'stockage ancien {R}/…', 'écrire', case when m50 then 'refus' else 'oui' end,
      format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'photos', format('%s/x.jpg', v_r)),
      case when m50 then 'm50' else 'faille connue F13 (compte sans entreprise qui écrit), fermée par 50' end);
    l := l || pg_temp.essai('R', v_r, 'creer_theme_produit_libre', 'appeler', case when m45 then 'refus' else 'oui' end,
      'select public.creer_theme_produit_libre(''essai'', ''Thème essai isolation'', null, null)',
      case when m45 then 'm45' else 'faille connue F12, fermée par 45' end);

    -- ==========================================================
    -- 6. La structure (éditeur SQL)
    -- ==========================================================
    -- Le retrait de R a gardé son nom (48)
    l := l || pg_temp.essai('base', null, 'anciens_membres', 'R gardé', 'oui',
      format('select 1 from anciens_membres where organisation_id = %L and user_id = %L', v_org_a, v_r), 'm48', m48);
    -- … et purgé ses abonnements push (48)
    l := l || pg_temp.essai('base', null, 'abonnements_push', 'R purgé', case when m48 then '0' else 'oui' end,
      format('select 1 from abonnements_push where artisan_id = %L', v_r),
      case when m48 then 'm48' else 'faille connue F7, fermée par 48' end);
    -- Supprimer le compte de E, qui a des notes : refus (51 ; avant, ses notes partaient)
    l := l || pg_temp.essai('base', null, 'auth.users', 'supprimer un compte qui a écrit', case when m51 then 'refus' else 'oui' end,
      format('delete from auth.users where id = %L', v_e),
      case when m51 then 'm51' else 'faille connue : ses notes partent en cascade, fermée par 51' end);
    -- Supprimer TOUTE l'organisation B (avec projet, devis, facture) : oui
    l := l || pg_temp.essai('base', null, 'organisations', 'supprimer une entreprise entière', 'oui',
      format('delete from organisations where id = %L', v_org_b), 'doit rester possible (NO ACTION, pas RESTRICT)');
    -- Un rôle inconnu : refus (45)
    l := l || pg_temp.essai('base', null, 'memberships', 'rôle inconnu', case when m45 then 'refus' else 'oui' end,
      format('update memberships set role = %L where user_id = %L', 'patron', v_e),
      case when m45 then 'm45' else 'aucune contrainte de rôle avant 45' end);

    -- ==========================================================
    -- 7. Anon : chaque table publique renvoie 0 ou refus
    -- ==========================================================
    for t in
      select c.relname::text
      from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public' and c.relkind in ('r', 'p')
      order by 1
    loop
      l := l || pg_temp.essai('anon', null, t, 'lire', '0|refus', format('select 1 from public.%I limit 1', t));
    end loop;
    l := l || pg_temp.essai('anon', null, 'storage.objects', 'lire', '0|refus',
      format('select 1 from storage.objects where bucket_id in (%L, %L) limit 1', 'photos', 'logos'));
    l := l || pg_temp.essai('anon', null, 'prochain_numero_facture(A)', 'appeler', case when m45 then 'refus' else 'oui' end,
      format('select public.prochain_numero_facture(%L, 2099)', v_org_a),
      case when m45 then 'm45' else 'faille connue F5, fermée par 45' end);
    l := l || pg_temp.essai('anon', null, 'creer_theme_produit_libre', 'appeler', case when m45 then 'refus' else 'oui' end,
      'select public.creer_theme_produit_libre(''essai'', ''Thème essai isolation'', null, null)',
      case when m45 then 'm45' else 'faille connue F12, fermée par 45' end);
    l := l || pg_temp.essai('anon', null, 'est_proprietaire(A)', 'appeler', 'refus',
      format('select public.est_proprietaire(%L)', v_org_a), 'm45', m45);
    l := l || pg_temp.essai('anon', null, 'repondre_devis_public', 'appeler', case when m52 then 'refus' else 'oui' end,
      format('select public.repondre_devis_public(%L, %L, null, null, %L, %L)', v_dv_envoye, 'refuse', '1.2.3.4', 'faux'),
      case when m52 then 'm52 : seule la route serveur appelle' else 'faille connue F11, fermée par 52' end);
    -- Ouvert par conception : le client lit son devis par le lien
    l := l || pg_temp.essai('anon', null, 'obtenir_devis_public', 'appeler', 'oui',
      format('select * from public.obtenir_devis_public(%L)', v_dv_envoye), 'ouvert par conception');

    -- ==========================================================
    -- 8. Le canari
    -- ==========================================================
    for t, raison in
      select c.relname::text, 'RLS désactivée'
      from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
      union all
      select p.tablename::text, format('policy « %s » sans mes_organisations() ni auth.uid()', p.policyname)
      from pg_policies p
      where p.schemaname = 'public'
        and coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') !~ '(mes_organisations|auth\.uid)'
        -- Lecture publique voulue (Module 15) : les titres de problèmes ne
        -- contiennent aucune donnée personnelle.
        and not (p.tablename = 'problemes_produits' and p.policyname = 'un artisan connecté lit les problèmes signalés')
    loop
      nb_canari := nb_canari + 1;
      l := l || row(null, 'base', t, 'canari', 'aucune ligne', raison, 'ÉCHEC',
        'toute table doit filtrer par mes_organisations() ou auth.uid()', null)::resultats_isolation;
    end loop;
    if nb_canari = 0 then
      l := l || row(null, 'base', 'toutes les tables', 'canari', 'aucune ligne', 'aucune ligne', 'OK',
        'chaque table a la RLS et une policy qui filtre', null)::resultats_isolation;
    end if;

    -- Fin : on annule TOUT ce qui précède (données de test comprises).
    raise exception using errcode = 'P0001', message = 'compyo:fin-des-essais';
  exception when others then
    if sqlerrm <> 'compyo:fin-des-essais' then
      raise;
    end if;
  end;

  insert into resultats_isolation (n, profil, objet, action, attendu, obtenu, statut, note, detail)
  select o::int, u.profil, u.objet, u.action, u.attendu, u.obtenu, u.statut, u.note, u.detail
  from unnest(l) with ordinality as u(n0, profil, objet, action, attendu, obtenu, statut, note, detail, o);

  insert into resultats_isolation (n, profil, objet, action, attendu, obtenu, statut, note, detail)
  select 0, 'BILAN', null, null, null, null,
    case when count(*) filter (where statut = 'ÉCHEC') = 0 then 'OK' else 'ÉCHEC' end,
    format('%s OK, %s ÉCHEC, %s ignorés — modules détectés : 45 %s, 46 %s, 47 %s, 48 %s, 49 %s, 50 %s, 51 %s, 52 %s',
      count(*) filter (where statut = 'OK'),
      count(*) filter (where statut = 'ÉCHEC'),
      count(*) filter (where statut = 'ignoré'),
      case when m45 then 'oui' else 'non' end, case when m46 then 'oui' else 'non' end,
      case when m47 then 'oui' else 'non' end, case when m48 then 'oui' else 'non' end,
      case when m49 then 'oui' else 'non' end, case when m50 then 'oui' else 'non' end,
      case when m51 then 'oui' else 'non' end, case when m52 then 'oui' else 'non' end),
    null
  from resultats_isolation;
end
$banc$;

-- Le rapport : la ligne BILAN, puis les ÉCHEC, puis le reste.
select n, statut, profil, objet, action, attendu, obtenu, note, detail
from resultats_isolation
order by (n = 0) desc, (statut = 'ÉCHEC') desc, n;

rollback;
