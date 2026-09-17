// Détection d'une migration non appliquée. Deux fois (12 et 13/09), un
// "bug" de Compyo n'était en réalité qu'un module de supabase/schema.sql
// jamais exécuté en production : le code écrivait une colonne que la base
// ne connaissait pas. Le message générique ("réessayez") envoyait chercher
// ailleurs, et réessayer échouait à l'identique.
//
// 42703 : colonne inconnue (Postgres). PGRST204 : colonne absente du cache
// de schéma (PostgREST).
export function estColonneManquante(erreur: { code?: string } | null | undefined): boolean {
  return erreur?.code === "42703" || erreur?.code === "PGRST204";
}

export const MESSAGE_BASE_PAS_A_JOUR =
  "Base de données pas à jour : une colonne attendue par l'application est absente. Rejouez supabase/schema.sql dans l'éditeur SQL Supabase.";
