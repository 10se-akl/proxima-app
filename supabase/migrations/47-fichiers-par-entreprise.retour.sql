-- ============================================================
-- Retour arrière du Module 47.
--
-- ORDRE : seulement si le Module 50 n'est PAS passé (ou a été défait par
-- son propre retour) : sans fichiers_historiques ni anciennes policies,
-- les anciennes photos deviendraient illisibles.
--
-- DEUX CAS.
-- A. Le nouveau code (lot 2) n'a JAMAIS été en production : on peut tout
--    retirer, décommentez la partie B en plus de la partie A.
-- B. Le nouveau code a tourné, même une heure : des fichiers existent
--    sous {organisation}/… ; GARDEZ la policy « un membre gère les
--    fichiers de son organisation », sinon ces fichiers deviennent
--    illisibles. Ne passez que la partie A.
-- Rejouable.
-- ============================================================

-- Partie A : les anciens fichiers retrouvent leurs seules policies
-- d'origine (par auteur, toujours en place pendant le temps 1).
drop policy if exists "un membre lit les anciens fichiers de son organisation" on storage.objects;
drop policy if exists "un membre supprime les anciens fichiers de son organisation" on storage.objects;
drop function if exists remplir_fichiers_historiques();
drop table if exists fichiers_historiques;

-- Partie B (seulement si le nouveau code n'a jamais tourné) :
-- drop policy if exists "un membre gère les fichiers de son organisation" on storage.objects;
