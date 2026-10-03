-- ============================================================
-- Module 50 (refonte, duel A, 03/10) — Les fichiers ne dépendent plus de
-- leur auteur. TEMPS 2 (resserrement).
--
-- PRÉREQUIS : le code du lot 2 (envois sous {organisation}/…) est en
-- production depuis AU MOINS DEUX SEMAINES, pour que les applications
-- installées sur les téléphones l'aient pris. Banc d'isolation rejoué
-- sur la copie avec ce module : 0 ÉCHEC.
--
-- POURQUOI. Le Module 47 a ouvert l'accès par entreprise ; les anciennes
-- règles, par auteur, restaient en place pendant la transition. Tant
-- qu'elles existent :
--   F6b — les photos de chantier d'une personne passée dans une autre
--         entreprise restent lisibles par cette autre entreprise ;
--   F13 — un compte sans entreprise (candidat en attente, membre retiré)
--         peut écrire sans limite dans son propre dossier.
-- On les retire. Les anciens fichiers restent lisibles par leur
-- entreprise grâce à fichiers_historiques, relevé une dernière fois ici
-- pour attraper ce qu'une ancienne version de l'application aurait
-- encore envoyé sous {auteur}/….
--
-- Les dossiers « photos » et « logos » reçoivent aussi une taille et des
-- types maximum (aucun aujourd'hui). Le SVG est exclu des logos : un SVG
-- peut contenir du script. Ces limites ne touchent que les NOUVEAUX
-- envois : les fichiers déjà là restent lisibles. Vérifier avant les
-- tailles et types réels (docs/deploiement-equipe.md, migration 50).
--
-- Rejouable. Retour arrière : supabase/migrations/50-fichiers-fin-ancien-acces.retour.sql.
-- ============================================================

-- 1. Le dernier relevé des anciens chemins.
select remplir_fichiers_historiques();

-- 2. Fin des règles par auteur (et de leurs ancêtres d'avant le Module 14,
-- normalement déjà retirées).
drop policy if exists "un membre de l'organisation gère les photos de l'équipe" on storage.objects;
drop policy if exists "un membre de l'organisation gère le logo de l'équipe" on storage.objects;
drop policy if exists "un artisan gère ses propres photos" on storage.objects;
drop policy if exists "un artisan gère son propre logo" on storage.objects;

-- 3. Tailles et types.
update storage.buckets
   set file_size_limit = 26214400, -- 25 Mo
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
 where id = 'photos';

update storage.buckets
   set file_size_limit = 5242880, -- 5 Mo
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'logos';
