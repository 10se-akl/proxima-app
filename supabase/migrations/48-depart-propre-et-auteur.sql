-- ============================================================
-- Module 48 (refonte, duel A, 03/10) — Départ propre et auteur.
-- TEMPS 1 (additif) : à passer AVANT de pousser la branche.
--
-- POURQUOI.
-- Le départ d'un membre (route /api/equipe/retirer : on supprime sa
-- ligne memberships, rien d'autre) laissait deux traces :
--   - son nom disparaissait des « créé par » : la policy de lecture des
--     profils ne couvre que les membres actuels ;
--   - F7 : ses abonnements push restaient, et les tâches serveur
--     continuaient de lui envoyer des titres de notes et des noms de
--     clients.
-- Désormais la BASE fait le ménage elle-même, quel que soit le chemin
-- du retrait (route, éditeur SQL, suppression du compte) :
--   - son nom est gardé dans anciens_membres (lisible par l'entreprise) ;
--   - ses abonnements push de cette entreprise sont supprimés.
--
-- Greffe 1 (l'auteur au carnet) : artisan_id dit « qui a créé la
-- ligne », mais rien ne le contrôlait : n'importe quel membre pouvait
-- écrire une note « au nom du patron ». Sur les cinq tables du carnet,
-- un appel fait au nom d'un utilisateur reçoit d'office son propre
-- identifiant à la création, et ne peut plus le réécrire ensuite.
-- forcer_auteur est SANS « security definer » : elle regarde current_user.
-- Les tâches serveur (service_role) et les fonctions publiques security
-- definer (signature en ligne) ne sont pas concernées : elles écrivent
-- au nom de l'artisan du devis, comme avant.
--
-- Compatible avec le code actuel : chaque écran écrit déjà
-- artisan_id = l'utilisateur connecté (vérifié).
--
-- Rejouable. Retour arrière : supabase/migrations/48-depart-propre-et-auteur.retour.sql.
-- ============================================================

-- Pas de clé vers auth.users : le nom doit survivre à la suppression du
-- compte (à l'anonymisation RGPD, on remplace le nom par « Ancien
-- membre », voir docs/deploiement-equipe.md).
create table if not exists anciens_membres (
  organisation_id uuid not null references organisations(id) on delete cascade,
  user_id uuid not null,
  nom text not null,
  retire_le timestamptz not null default now(),
  primary key (organisation_id, user_id)
);

create index if not exists anciens_membres_user_idx on anciens_membres (user_id);

alter table anciens_membres enable row level security;

drop policy if exists "un membre lit les anciens membres de son organisation" on anciens_membres;
create policy "un membre lit les anciens membres de son organisation"
  on anciens_membres for select
  using (organisation_id in (select mes_organisations()));

-- Security definer : le retrait passe par la clé serveur, par l'éditeur
-- SQL ou par la suppression d'un compte (rôle du service d'auth) ; la
-- fonction doit pouvoir écrire anciens_membres et abonnements_push dans
-- tous les cas.
create or replace function apres_retrait_membre()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- L'entreprise elle-même est en cours de suppression (cascade) : rien
  -- à garder, et l'insertion échouerait sur la clé vers organisations.
  if not exists (select 1 from organisations where id = old.organisation_id) then
    return old;
  end if;

  insert into anciens_membres (organisation_id, user_id, nom)
  values (
    old.organisation_id,
    old.user_id,
    coalesce((select nullif(btrim(p.nom), '') from profils p where p.id = old.user_id), 'Ancien membre')
  )
  on conflict (organisation_id, user_id)
  do update set nom = excluded.nom, retire_le = now();

  delete from abonnements_push
   where artisan_id = old.user_id
     and organisation_id = old.organisation_id;

  return old;
end;
$$;

revoke execute on function apres_retrait_membre() from public, anon, authenticated;

drop trigger if exists apres_retrait_membre_trigger on memberships;
create trigger apres_retrait_membre_trigger
  after delete on memberships
  for each row execute function apres_retrait_membre();

-- L'auteur d'une ligne du carnet est celui qui l'écrit.
create or replace function forcer_auteur()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      new.artisan_id := auth.uid();
    else
      new.artisan_id := old.artisan_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists forcer_auteur_trigger on demandes;
create trigger forcer_auteur_trigger
  before insert or update on demandes
  for each row execute function forcer_auteur();

drop trigger if exists forcer_auteur_trigger on notes;
create trigger forcer_auteur_trigger
  before insert or update on notes
  for each row execute function forcer_auteur();

drop trigger if exists forcer_auteur_trigger on notes_vocales;
create trigger forcer_auteur_trigger
  before insert or update on notes_vocales
  for each row execute function forcer_auteur();

drop trigger if exists forcer_auteur_trigger on evenements_planning;
create trigger forcer_auteur_trigger
  before insert or update on evenements_planning
  for each row execute function forcer_auteur();

drop trigger if exists forcer_auteur_trigger on evenements_projet;
create trigger forcer_auteur_trigger
  before insert or update on evenements_projet
  for each row execute function forcer_auteur();
