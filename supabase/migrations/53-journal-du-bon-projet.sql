-- ============================================================
-- Module 53 (23/10) — Le journal d'un projet ne s'écrit que pour un projet
-- de sa propre entreprise.
--
-- POURQUOI (relecture sécurité du 23/10, faille antérieure à ce jour) :
-- la règle d'écriture de evenements_projet ne vérifiait que
-- organisation_id ∈ mes_organisations(). Un membre de l'entreprise A
-- pouvait donc insérer une trace avec organisation_id = A et demande_id =
-- un projet de l'entreprise B. B ne la voyait pas (lecture filtrée par
-- organisation), mais :
--   - on pouvait tester si un identifiant de projet existe (l'insertion
--     passe ou échoue sur la clé étrangère) ;
--   - depuis le Module 51 (clés en NO ACTION), cette ligne orpheline
--     pouvait empêcher la suppression du projet de B.
-- Désormais, le projet visé doit appartenir à la même entreprise que la
-- trace. La sous-requête sur demandes passe elle-même par la RLS de
-- demandes (un membre ne voit que les projets de son entreprise) : c'est
-- plus strict, jamais plus large.
--
-- Effet sur l'application : aucun. Le navigateur n'écrit des traces que
-- pour les projets de l'entreprise de l'artisan connecté (lib/timeline.ts,
-- enregistrerEvenement) ; les routes serveur (clé service) ne sont pas
-- concernées par la RLS.
--
-- Rejouable. Retour arrière : supabase/migrations/53-journal-du-bon-projet.retour.sql.
--
-- AVANT, pour mémoire (doit renvoyer 0 : aucune trace déjà mal rangée) :
--   select count(*) from evenements_projet e
--   join demandes d on d.id = e.demande_id
--   where d.organisation_id is distinct from e.organisation_id;
-- ============================================================

drop policy if exists "un membre ajoute au journal de son organisation" on evenements_projet;
create policy "un membre ajoute au journal de son organisation"
  on evenements_projet for insert
  with check (
    organisation_id in (select mes_organisations())
    and exists (
      select 1 from demandes d
      where d.id = evenements_projet.demande_id
        and d.organisation_id = evenements_projet.organisation_id
    )
  );

-- APRÈS : la règle doit apparaître avec « exists » dans sa condition.
--   select policyname, with_check from pg_policies
--   where tablename = 'evenements_projet' and cmd = 'INSERT';
