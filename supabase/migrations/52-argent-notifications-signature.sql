-- ============================================================
-- Module 52 (refonte, duel A, 03/10) — Argent, notifications, signature
-- publique. TEMPS 2 (resserrement), APRÈS le Module 51.
--
-- PRÉREQUIS : le code du lot 8 est en production (route d'abonnement et
-- route de signature avec le client serveur, IBAN en lecture seule pour
-- l'équipe). Banc d'isolation rejoué sur la copie avec ce module : 0 ÉCHEC.
--
-- POURQUOI.
-- F9 — Tout membre pouvait changer l'IBAN imprimé sur les factures : un
--   risque de fraude réel (un salarié qui met son propre compte). Un IBAN
--   ou un BIC DÉJÀ RENSEIGNÉ ne change plus que par le propriétaire de
--   l'entreprise ; un IBAN encore vide se saisit par n'importe qui (la
--   conjointe qui tient la banque). Les autres portes sont déjà fermées :
--   supprimer puis recréer les paramètres (Module 51), forger l'IBAN d'une
--   facture ou d'un devis (Module 46). Le transfert de propriété se fait
--   par le support (docs/deploiement-equipe.md).
--   proteger_iban est SANS « security definer » : elle regarde
--   current_user (les routes serveur et l'éditeur SQL restent libres).
-- F10 — abonnements_push était ouvert en lecture et en écriture à toute
--   l'équipe : on lisait les clés de ses coéquipiers, ou on s'abonnait
--   « au nom du patron ». Le navigateur ne lit et ne supprime plus que
--   SES abonnements ; l'écriture passe par /api/notifications/abonner.
-- F11 — repondre_devis_public était appelable en direct, avec une IP et
--   un navigateur inventés : la preuve de signature ne valait rien. Elle
--   est réservée au serveur (route /api/devis-public/[id]/repondre).
-- Partages — un ancien membre gardait la lecture des messages de clients
--   qu'il avait partagés vers Compyo : il faut désormais être encore
--   membre de l'entreprise du partage.
-- Rôles — la contrainte du Module 45, posée sans relire l'existant, est
--   validée.
--
-- Rejouable. Retour arrière : supabase/migrations/52-argent-notifications-signature.retour.sql.
-- ============================================================

-- 1. L'IBAN et le BIC déjà saisis.
create or replace function proteger_iban()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if (nullif(btrim(coalesce(old.iban, '')), '') is not null and new.iban is distinct from old.iban)
     or (nullif(btrim(coalesce(old.bic, '')), '') is not null and new.bic is distinct from old.bic)
  then
    if not public.est_proprietaire(old.organisation_id) then
      raise exception 'L''IBAN et le BIC déjà enregistrés ne peuvent être changés que par la personne qui a ouvert le compte';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_iban_trigger on parametres_entreprise;
create trigger proteger_iban_trigger
  before update on parametres_entreprise
  for each row execute function proteger_iban();

-- 2. Les abonnements push : chacun les siens, en lecture et suppression.
drop policy if exists "un membre gère les abonnements push de son organisation" on abonnements_push;
drop policy if exists "chacun lit ses propres abonnements push" on abonnements_push;
create policy "chacun lit ses propres abonnements push"
  on abonnements_push for select
  using (artisan_id = auth.uid());
drop policy if exists "chacun supprime ses propres abonnements push" on abonnements_push;
create policy "chacun supprime ses propres abonnements push"
  on abonnements_push for delete
  using (artisan_id = auth.uid());

-- 3. La signature publique : par le serveur seulement.
revoke execute on function repondre_devis_public(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function repondre_devis_public(uuid, text, text, text, text, text) to service_role;

-- 4. Les partages entrants : les siens, dans son entreprise actuelle.
drop policy if exists "un artisan gère ses propres partages entrants" on partages_entrants;
drop policy if exists "un membre gère ses propres partages entrants" on partages_entrants;
create policy "un membre gère ses propres partages entrants"
  on partages_entrants for all
  using (artisan_id = auth.uid() and organisation_id in (select mes_organisations()))
  with check (artisan_id = auth.uid() and organisation_id in (select mes_organisations()));

-- 5. La contrainte des rôles, validée.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'memberships_role_valide' and not convalidated
  ) then
    alter table memberships validate constraint memberships_role_valide;
  end if;
end $$;
