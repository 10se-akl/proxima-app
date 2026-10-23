-- ============================================================
-- Retour arrière du Module 53 — remet la règle d'écriture du journal telle
-- qu'au Module 51 (organisation de la trace seulement). Rejouable.
-- ============================================================

drop policy if exists "un membre ajoute au journal de son organisation" on evenements_projet;
create policy "un membre ajoute au journal de son organisation"
  on evenements_projet for insert
  with check (organisation_id in (select mes_organisations()));
