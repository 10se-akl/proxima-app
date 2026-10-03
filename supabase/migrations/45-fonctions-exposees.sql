-- ============================================================
-- Module 45 (refonte, duel A, 03/10) — Fonctions exposées et rôle.
-- TEMPS 1 (additif) : à passer AVANT de pousser la branche.
--
-- POURQUOI.
-- F5 — prochain_numero_facture() est « security definer » (elle contourne
--   la RLS) et ne vérifiait rien : n'importe qui, même sans compte,
--   pouvait faire avancer le compteur de factures de n'importe quelle
--   entreprise dont il connaissait l'identifiant, et creuser des trous
--   dans une numérotation que la loi veut continue. Elle vérifie
--   désormais que l'appelant est membre de l'entreprise, et n'est plus
--   appelable par un visiteur anonyme.
-- F12 — creer_theme_produit_libre() était appelable par n'importe qui :
--   on pouvait injecter des thèmes dans la carte publique sans passer par
--   la route (qui, elle, l'appelle avec la clé serveur).
-- Rôle — est_proprietaire() servira à la protection de l'IBAN (Module
--   52) ; la contrainte sur memberships.role interdit dès maintenant tout
--   rôle inconnu (posée « not valid » : elle ne relit pas les lignes
--   existantes ; le Module 52 la valide).
--
-- ATTENTION (Supabase) : Supabase accorde EXECUTE à « anon » et à
-- « authenticated » sur chaque nouvelle fonction. Un « revoke … from
-- public » seul ne suffit pas : on retire les droits rôle par rôle.
--
-- Rejouable. Retour arrière : supabase/migrations/45-fonctions-exposees.retour.sql.
-- ============================================================

create or replace function prochain_numero_facture(p_organisation_id uuid, p_annee integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero integer;
begin
  -- Module 45 : seul un membre de l'entreprise tire un numéro de facture.
  if not exists (
    select 1 from memberships
    where user_id = auth.uid() and organisation_id = p_organisation_id
  ) then
    raise exception 'Organisation non autorisée';
  end if;

  insert into compteurs_facturation (organisation_id, annee, dernier_numero)
  values (p_organisation_id, p_annee, 1)
  on conflict (organisation_id, annee)
  do update set dernier_numero = compteurs_facturation.dernier_numero + 1
  returning dernier_numero into v_numero;
  return v_numero;
end;
$$;

revoke execute on function prochain_numero_facture(uuid, integer) from public, anon;
grant execute on function prochain_numero_facture(uuid, integer) to authenticated;

-- Appelée uniquement par app/api/retours/route.ts, avec le client admin
-- (service_role) : plus personne d'autre.
revoke execute on function creer_theme_produit_libre(text, text, text, text) from public, anon, authenticated;
grant execute on function creer_theme_produit_libre(text, text, text, text) to service_role;

-- « L'appelant est-il propriétaire de cette entreprise ? » Security
-- definer pour lire memberships sans dépendre de sa RLS (même raison que
-- mes_organisations()). Elle ne regarde que auth.uid() : aucune
-- dépendance au rôle Postgres courant.
create or replace function est_proprietaire(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and organisation_id = p_org and role = 'proprietaire'
  );
$$;

revoke execute on function est_proprietaire(uuid) from public, anon;
grant execute on function est_proprietaire(uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'memberships_role_valide') then
    alter table memberships
      add constraint memberships_role_valide
      check (role in ('proprietaire', 'employe')) not valid;
  end if;
end $$;
