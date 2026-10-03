-- ============================================================
-- Retour arrière du Module 45 — remet les fonctions dans leur état du
-- Module 28 / 22 (sans contrôle, appelables par tous).
--
-- ORDRE : à ne passer qu'après le retour du Module 52 s'il a été passé
-- (le trigger proteger_iban appelle est_proprietaire()).
-- Rejouable.
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
  insert into compteurs_facturation (organisation_id, annee, dernier_numero)
  values (p_organisation_id, p_annee, 1)
  on conflict (organisation_id, annee)
  do update set dernier_numero = compteurs_facturation.dernier_numero + 1
  returning dernier_numero into v_numero;
  return v_numero;
end;
$$;

grant execute on function prochain_numero_facture(uuid, integer) to public, anon, authenticated, service_role;
grant execute on function creer_theme_produit_libre(text, text, text, text) to public, anon, authenticated, service_role;

drop function if exists est_proprietaire(uuid);

alter table memberships drop constraint if exists memberships_role_valide;
