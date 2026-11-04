-- ============================================================
-- Retour arrière du Module 54 (messages de Compyo aux comptes).
-- Supprime les deux tables et tout ce qu'elles contiennent : les
-- messages publiés depuis /admin/annonces et qui les a lus.
-- La cloche continue de marcher sans elles (lib/annonces.ts).
-- ============================================================

drop table if exists annonces_lues;
drop table if exists annonces;
