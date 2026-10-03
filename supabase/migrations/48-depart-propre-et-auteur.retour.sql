-- ============================================================
-- Retour arrière du Module 48 — retire les deux triggers et leurs
-- fonctions.
--
-- La table anciens_membres est GARDÉE : elle est inoffensive (lecture
-- seule, limitée à l'entreprise) et le nouveau code la lit (page
-- /rejoindre, prénom au carnet). Pour la retirer aussi, d'abord revenir
-- au code précédent, puis décommenter la dernière ligne.
-- Rejouable.
-- ============================================================

drop trigger if exists apres_retrait_membre_trigger on memberships;
drop function if exists apres_retrait_membre();

drop trigger if exists forcer_auteur_trigger on demandes;
drop trigger if exists forcer_auteur_trigger on notes;
drop trigger if exists forcer_auteur_trigger on notes_vocales;
drop trigger if exists forcer_auteur_trigger on evenements_planning;
drop trigger if exists forcer_auteur_trigger on evenements_projet;
drop function if exists forcer_auteur();

-- drop table if exists anciens_membres;
