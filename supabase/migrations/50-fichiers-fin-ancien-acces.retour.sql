-- ============================================================
-- Retour arrière du Module 50 — recrée MOT POUR MOT les deux règles par
-- auteur du Module 14 (schema.sql) et retire les limites des dossiers.
-- Les failles F6b et F13 reviennent ; rien ne devient illisible.
-- Rejouable.
-- ============================================================

drop policy if exists "un membre de l'organisation gère les photos de l'équipe" on storage.objects;
create policy "un membre de l'organisation gère les photos de l'équipe"
  on storage.objects for all
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from memberships m
      where m.user_id = auth.uid()
      and m.organisation_id in (
        select organisation_id from memberships
        where user_id = ((storage.foldername(name))[1])::uuid
      )
    )
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "un membre de l'organisation gère le logo de l'équipe" on storage.objects;
create policy "un membre de l'organisation gère le logo de l'équipe"
  on storage.objects for all
  using (
    bucket_id = 'logos'
    and exists (
      select 1 from memberships m
      where m.user_id = auth.uid()
      and m.organisation_id in (
        select organisation_id from memberships
        where user_id = ((storage.foldername(name))[1])::uuid
      )
    )
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

update storage.buckets
   set file_size_limit = null, allowed_mime_types = null
 where id in ('photos', 'logos');
