-- ============================================================
-- Retour arrière du Module 49.
--
-- ORDRE : d'abord revenir au code précédent (la route /api/equipe/inviter
-- de master n'utilise pas cette table) ; sinon l'écran Équipe et la page
-- /rejoindre afficheront une erreur. Les invitations en cours sont
-- perdues (les personnes devront être réinvitées).
-- Rejouable.
-- ============================================================

drop table if exists invitations;
