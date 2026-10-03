-- ============================================================
-- Retour arrière du Module 46 — remet le verrou du devis dans sa
-- version 42c et retire les deux contrôles ajoutés.
-- Rejouable.
-- ============================================================

create or replace function verrouiller_devis_valide()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists verrouiller_signature_a_la_creation_trigger on devis;
drop function if exists verrouiller_signature_a_la_creation();

drop trigger if exists imposer_coordonnees_bancaires_factures on factures;
drop trigger if exists imposer_coordonnees_bancaires_devis on devis;
drop function if exists imposer_coordonnees_bancaires();
