-- ============================================================
-- Retour arrière du Module 52 — remet la règle « for all » des
-- abonnements push (Module 27bis), celle d'origine des partages (Module
-- 24), et rouvre repondre_devis_public à tous. Le code du lot 8 continue
-- de marcher (il passe par le serveur). La contrainte des rôles reste
-- validée : elle est inoffensive.
-- Rejouable.
-- ============================================================

drop trigger if exists proteger_iban_trigger on parametres_entreprise;
drop function if exists proteger_iban();

drop policy if exists "chacun lit ses propres abonnements push" on abonnements_push;
drop policy if exists "chacun supprime ses propres abonnements push" on abonnements_push;
drop policy if exists "un membre gère les abonnements push de son organisation" on abonnements_push;
create policy "un membre gère les abonnements push de son organisation"
  on abonnements_push for all
  using (organisation_id in (select mes_organisations()))
  with check (organisation_id in (select mes_organisations()));

grant execute on function repondre_devis_public(uuid, text, text, text, text, text) to public, anon, authenticated, service_role;

drop policy if exists "un membre gère ses propres partages entrants" on partages_entrants;
drop policy if exists "un artisan gère ses propres partages entrants" on partages_entrants;
create policy "un artisan gère ses propres partages entrants"
  on partages_entrants for all
  using (artisan_id = auth.uid())
  with check (artisan_id = auth.uid());
