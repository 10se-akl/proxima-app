-- ============================================================
-- Module 49 (refonte, duel A, 03/10) — Invitations à accepter.
-- TEMPS 1 (additif) : à passer AVANT de pousser la branche.
--
-- POURQUOI. L'invitation d'équipe rattachait directement à l'entreprise
-- tout compte qui portait l'adresse invitée, sans que la personne ait
-- rien accepté (chemin de « réactivation » de /api/equipe/inviter), et
-- disait au patron si l'adresse avait déjà un compte. Désormais :
--   - une invitation est une ligne ici, valable 14 jours ;
--   - la personne, connectée avec l'adresse invitée (prouvée par un lien
--     reçu dans sa boîte mail), appuie sur « Rejoindre » ; c'est
--     automatique quand elle vient de créer son compte par l'invitation ;
--   - le patron reçoit toujours la même réponse, et dispose de
--     « Renvoyer » et « Annuler ».
--
-- Les membres de l'entreprise LISENT ses invitations (« Sophie, en
-- attente »). Personne n'en écrit depuis le navigateur : seules les
-- routes serveur (clé service_role) créent, renvoient, annulent ou
-- acceptent une invitation, après avoir vérifié qui appelle.
--
-- Rejouable. Retour arrière : supabase/migrations/49-invitations.retour.sql.
-- ============================================================

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  email text not null,
  prenom text not null,
  invite_par uuid references auth.users(id) on delete set null,
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null default now() + interval '14 days',
  acceptee_le timestamptz,
  annulee_le timestamptz,
  constraint invitations_email_normalise
    check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  constraint invitations_prenom_longueur
    check (char_length(btrim(prenom)) between 1 and 60)
);

-- Une seule invitation en cours par adresse et par entreprise : inviter
-- de nouveau la même adresse la renvoie au lieu d'en créer une deuxième.
create unique index if not exists invitations_en_cours
  on invitations (organisation_id, email)
  where acceptee_le is null and annulee_le is null;

-- La page /rejoindre cherche les invitations de l'adresse connectée.
create index if not exists invitations_email_en_cours_idx
  on invitations (email)
  where acceptee_le is null and annulee_le is null;

alter table invitations enable row level security;

drop policy if exists "un membre lit les invitations de son organisation" on invitations;
create policy "un membre lit les invitations de son organisation"
  on invitations for select
  using (organisation_id in (select mes_organisations()));

-- Volontairement AUCUNE policy d'écriture (voir l'en-tête).
