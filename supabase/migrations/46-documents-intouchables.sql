-- ============================================================
-- Module 46 (refonte, duel A, 03/10) — Documents intouchables.
-- TEMPS 1 (additif) : à passer AVANT de pousser la branche.
--
-- POURQUOI.
-- F4 — Le verrou du devis validé (Module 41, version 42c) se contournait :
--   n'importe quel membre pouvait repasser un devis envoyé en
--   « brouillon », puis en réécrire librement les prix (le verrou laisse
--   tout passer sur un brouillon). Il pouvait aussi écrire lui-même les
--   colonnes de signature (nom, tracé, IP, navigateur, date) : la preuve
--   de la signature électronique ne valait plus rien. Désormais :
--     - un devis sorti du brouillon n'y revient jamais (on le duplique) ;
--     - seules la base et le serveur écrivent une signature : la fonction
--       repondre_devis_public (security definer) et les tâches serveur.
--       Un appel fait au nom d'un utilisateur (rôle « authenticated » ou
--       « anon ») qui touche signature_* est refusé, à la création comme
--       à la modification. signature_user_agent est dans le verrou (F11).
-- F9 (côté documents) — L'IBAN imprimé sur une facture ou un devis
--   envoyé venait de ce que le navigateur envoyait (mentions_legales) :
--   une facture forgée en REST pouvait porter l'IBAN d'un fraudeur. La
--   base recopie désormais elle-même l'IBAN et le BIC des paramètres de
--   l'entreprise dans le document, au moment où il se fige (création
--   d'une facture ou d'un acompte, envoi d'un devis). Le reste des
--   mentions est inchangé.
--
-- IMPORTANT. Ces trois fonctions regardent current_user : elles sont
-- volontairement SANS « security definer ». Avec security definer,
-- current_user vaudrait le propriétaire de la fonction et le contrôle
-- tomberait. Les appels du serveur (service_role : crons, routes admin)
-- et des fonctions security definer (signature publique) ne sont pas
-- concernés : ce sont eux qui ont le droit d'écrire ces colonnes.
--
-- Compatible avec le code actuel : aucun écran ne remet un devis en
-- brouillon ni n'écrit signature_* (seuls devis/creer-vide et
-- devis/dupliquer créent des brouillons, par insertion, sans signature).
--
-- Rejouable. Retour arrière : supabase/migrations/46-documents-intouchables.retour.sql.
-- ============================================================

-- 1. Le verrou du devis (version 42c + deux contrôles placés AVANT le
-- « laissez-passer » du brouillon).
create or replace function verrouiller_devis_valide()
returns trigger
language plpgsql
as $$
begin
  -- Module 46 — un devis sorti du brouillon n'y revient jamais : c'est la
  -- porte par laquelle on réécrivait un devis déjà montré au client.
  if old.statut <> 'brouillon' and new.statut = 'brouillon' then
    raise exception 'Un devis validé ne redevient pas un brouillon — dupliquez-le pour en établir une nouvelle version';
  end if;

  -- Module 46 — la signature n'est écrite que par la base ou le serveur.
  if current_user in ('authenticated', 'anon')
     and (new.signature_nom, new.signature_data, new.signature_ip, new.signature_user_agent, new.signe_le)
         is distinct from
         (old.signature_nom, old.signature_data, old.signature_ip, old.signature_user_agent, old.signe_le)
  then
    raise exception 'La signature d''un devis ne s''écrit que par le lien envoyé au client';
  end if;

  if old.statut = 'brouillon' then
    return new;
  end if;

  if new.lignes is distinct from old.lignes
     or new.sous_total_ht is distinct from old.sous_total_ht
     or new.deplacement is distinct from old.deplacement
     or new.marge_pct is distinct from old.marge_pct
     or new.tva_pct is distinct from old.tva_pct
     or new.montant_tva is distinct from old.montant_tva
     or new.total_estime is distinct from old.total_estime
     or new.numero is distinct from old.numero
     or new.mention_tva_reduite is distinct from old.mention_tva_reduite
     or new.objet is distinct from old.objet
     or new.adresse_chantier is distinct from old.adresse_chantier
     or new.validite_jours is distinct from old.validite_jours
     or new.date_debut_prevue is distinct from old.date_debut_prevue
     or new.duree_estimee is distinct from old.duree_estimee
     or new.acompte_pct is distinct from old.acompte_pct
     or (old.mentions_legales is not null and new.mentions_legales is distinct from old.mentions_legales)
     or (old.lignes_vente is not null and new.lignes_vente is distinct from old.lignes_vente)
     or new.lots is distinct from old.lots
     or new.photos_incluses is distinct from old.photos_incluses
  then
    raise exception 'Un devis validé ne peut plus changer de contenu — dupliquez-le pour en établir une nouvelle version';
  end if;

  return new;
end;
$$;

drop trigger if exists verrouiller_devis_valide_trigger on devis;
create trigger verrouiller_devis_valide_trigger
  before update on devis
  for each row execute function verrouiller_devis_valide();

-- 2. Pas de devis créé « déjà signé » par un utilisateur.
create or replace function verrouiller_signature_a_la_creation()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.signature_nom is not null
          or new.signature_data is not null
          or new.signature_ip is not null
          or new.signature_user_agent is not null
          or new.signe_le is not null)
  then
    raise exception 'La signature d''un devis ne s''écrit que par le lien envoyé au client';
  end if;
  return new;
end;
$$;

drop trigger if exists verrouiller_signature_a_la_creation_trigger on devis;
create trigger verrouiller_signature_a_la_creation_trigger
  before insert on devis
  for each row execute function verrouiller_signature_a_la_creation();

-- 3. L'IBAN et le BIC d'un document figé viennent de la base, jamais du
-- navigateur.
create or replace function imposer_coordonnees_bancaires()
returns trigger
language plpgsql
as $$
declare
  v_banque jsonb;
begin
  if current_user not in ('authenticated', 'anon') or new.mentions_legales is null then
    return new;
  end if;
  -- Un devis déjà figé ne bouge plus : le verrou du devis s'en charge.
  if tg_op = 'UPDATE' and old.mentions_legales is not null then
    return new;
  end if;
  if jsonb_typeof(new.mentions_legales) <> 'object' then
    raise exception 'Mentions légales invalides';
  end if;

  -- Lu avec les droits de l'appelant : il ne voit que les paramètres de
  -- son entreprise, et le document n'est accepté que dans la sienne.
  select jsonb_build_object('iban', pe.iban, 'bic', pe.bic)
    into v_banque
    from parametres_entreprise pe
   where pe.organisation_id = new.organisation_id;

  new.mentions_legales := new.mentions_legales
    || coalesce(v_banque, jsonb_build_object('iban', null, 'bic', null));
  return new;
end;
$$;

-- Factures et acomptes : figés à la création. Un avoir recopie les
-- mentions de la facture qu'il annule (creer_avoir_et_annuler), déjà
-- passées par ce contrôle.
drop trigger if exists imposer_coordonnees_bancaires_factures on factures;
create trigger imposer_coordonnees_bancaires_factures
  before insert on factures
  for each row
  when (new.type in ('facture', 'acompte'))
  execute function imposer_coordonnees_bancaires();

-- Devis : figé à l'envoi (lib/devis/actions.ts, marquerDevisEnvoye), ou
-- forgé à la création par un appel direct.
drop trigger if exists imposer_coordonnees_bancaires_devis on devis;
create trigger imposer_coordonnees_bancaires_devis
  before insert or update of mentions_legales on devis
  for each row execute function imposer_coordonnees_bancaires();
