"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { genererMentionTvaReduite, recalculerDevis } from "@/lib/moteur-metier/calculerDevis";
import { lignesDeVente } from "@/lib/moteur-metier/prixDeVente";
import type { PosteFrequent } from "@/lib/postesFrequents";
import type { SourceDocumentDevis } from "@/lib/devis/modeleDocument";
import {
  avecLotParDefaut,
  lignesAEnregistrer,
  nouvelleCle,
  versLignesEditees,
  type LigneEditee,
} from "@/components/devis/EditeurLignes";
import { effacerBrouillon, ecrireBrouillon, empreinte, lireBrouillon } from "@/lib/brouillonLocal";
import type { Devis, LigneDevisCalculee, LotDevis, ParametresEntreprise } from "@/types";

// ============================================================
// L'état de l'édition d'un devis (refonte du 03/10, duel F lot 2).
//
// Extrait tel quel de components/dashboard/ValiderDevis.tsx, SANS aucun
// changement de comportement : l'écran ordinateur (l'ancien éditeur) et la
// revue sur téléphone (components/devis/RevueDevis.tsx) lisent et modifient
// le MÊME état, donc le même brouillon local. Un seul endroit où une
// modification se garde, une seule empreinte : rien ne peut se perdre parce
// qu'un des deux écrans l'aurait oublié.
//
// Ce qui ne bouge pas, et qu'il faut relire deux fois avant d'y toucher :
// - l'empreinte de « ce qui est enregistré » (baseBrouillon) : si le devis
//   a changé en base entre-temps, le brouillon local est jeté ;
// - « modifications retrouvées » : le brouillon n'est relu qu'à
//   l'ouverture, et seulement pour un devis encore « brouillon » ;
// - l'écriture du brouillon, 400 ms après la dernière modification, et son
//   effacement quand l'état revient à l'identique de l'enregistré ;
// - rien n'est écrit une fois le brouillon « abandonné » (validation
//   réussie, ou retour au devis enregistré).
// ============================================================

// Même garde-fou que pour quantité/prix unitaire (voir EditeurLignes.modifier) :
// un déplacement, une marge ou une TVA négative passerait le contrôle
// final "total_ttc <= 0" tant que le total reste positif, réduisant
// silencieusement le montant réellement envoyé au client sans aucun
// avertissement — on refuse donc la saisie négative dès la source.
export function valeurPositive(valeur: string): number {
  const nombre = Number(valeur);
  return !Number.isFinite(nombre) || nombre < 0 ? 0 : nombre;
}

// Tout ce que l'artisan peut modifier sur cet écran — ce que garde le
// brouillon local (lot H.2).
export type EtatEdition = {
  lignes: LigneEditee[];
  lots: LotDevis[];
  deplacement: number;
  margePct: number;
  tvaPct: number;
  commentaires: string;
  objet: string;
  validiteJours: string;
  acomptePct: string;
  dateDebut: string;
  dureeEstimee: string;
  chantierAilleurs: boolean;
  adresseChantier: string;
  mentionTvaReduite: string;
  mentionModifieeManuellement: boolean;
};

export function etatDepuisDevis(devis: Devis, parametres: ParametresEntreprise | null | undefined): EtatEdition {
  return {
    // Chaque ligne porte une clé stable et son origine (IA ou artisan) —
    // voir components/devis/EditeurLignes.tsx. Le badge "IA" (audit pré-bêta
    // du 09/09, point 🟡 n°19) repose sur cette origine : les lignes déjà là
    // au chargement viennent de la génération.
    lignes: versLignesEditees(devis.lignes, false),
    lots: devis.lots ?? [],
    deplacement: devis.deplacement,
    margePct: devis.marge_pct,
    tvaPct: devis.tva_pct,
    commentaires: devis.commentaires ?? "",
    // Conditions de l'offre (Module 42). Un devis créé depuis le 17/09 arrive
    // déjà rempli (voir conditionsParDefaut) ; pour un devis plus ancien, on
    // retombe sur les paramètres de l'entreprise, pour que l'artisan n'ait
    // jamais de champ vide à remplir de lui-même.
    objet: devis.objet ?? "",
    validiteJours: String(devis.validite_jours ?? parametres?.devis_validite_jours ?? 30),
    acomptePct:
      devis.acompte_pct != null
        ? String(devis.acompte_pct)
        : parametres?.devis_acompte_pct != null
          ? String(parametres.devis_acompte_pct)
          : "",
    dateDebut: devis.date_debut_prevue ?? "",
    dureeEstimee: devis.duree_estimee ?? "",
    // L'adresse du chantier n'est obligatoire que si elle diffère de celle du
    // client : le champ reste masqué tant que l'artisan ne dit pas le
    // contraire, pour éviter une saisie inutile dans la plupart des cas.
    chantierAilleurs: Boolean(devis.adresse_chantier),
    adresseChantier: devis.adresse_chantier ?? "",
    // Mention TVA réduite (08/09) — suggérée automatiquement si le devis a
    // déjà un taux réduit au chargement, sinon vide. Reste éditable, et se
    // met à jour automatiquement UNIQUEMENT si l'artisan change le taux de
    // TVA lui-même et n'a encore rien tapé — jamais écrasée une fois
    // modifiée à la main (voir gestionnaireTvaPct plus bas).
    mentionTvaReduite: devis.mention_tva_reduite ?? genererMentionTvaReduite(devis.tva_pct) ?? "",
    mentionModifieeManuellement: Boolean(devis.mention_tva_reduite),
  };
}

// Comparable d'un état à l'autre : les clés des lignes changent à chaque
// chargement, elles ne comptent pas.
export const empreinteEtat = (e: EtatEdition) => empreinte({ ...e, lignes: e.lignes.map(({ cle: _cle, ...l }) => l) });

// Ce que le devis était en base quand l'édition a commencé : si l'un de ces
// champs change entre-temps (un collègue, un autre appareil, une nouvelle
// version), le brouillon local ne s'applique plus.
export const empreinteBase = (devis: Devis) =>
  empreinte([
    devis.statut,
    devis.lignes,
    devis.lots,
    devis.deplacement,
    devis.marge_pct,
    devis.tva_pct,
    devis.commentaires,
    devis.objet,
    devis.validite_jours,
    devis.acompte_pct,
    devis.date_debut_prevue,
    devis.duree_estimee,
    devis.adresse_chantier,
    devis.mention_tva_reduite,
  ]);

export const cleBrouillonDevis = (devisId: string) => `compyo:brouillon-devis:${devisId}`;

export function useEditionDevis(devis: Devis, parametres: ParametresEntreprise | null | undefined) {
  // Rien ne se perd (lot H.2) — voir lib/brouillonLocal.ts. Les
  // modifications non validées restent sur le téléphone : un rechargement,
  // une coupure au moment de valider ou un départ par la barre du bas ne
  // les font plus perdre. Elles sont retrouvées à la réouverture, tant que
  // le devis enregistré n'a pas changé entre-temps.
  const cleBrouillon = cleBrouillonDevis(devis.id);
  const [baseBrouillon] = useState(() => empreinteBase(devis));
  const [empreinteEnregistree] = useState(() => empreinteEtat(etatDepuisDevis(devis, parametres)));
  const [retrouve] = useState(() =>
    devis.statut === "brouillon" ? lireBrouillon<EtatEdition>(cleBrouillon, baseBrouillon) : null
  );
  const [depart] = useState(() => retrouve ?? etatDepuisDevis(devis, parametres));
  const brouillonAbandonne = useRef(false);

  const [lignes, setLignes] = useState<LigneEditee[]>(depart.lignes);
  const [lots, setLots] = useState<LotDevis[]>(depart.lots);
  const lignesPropres = useMemo(() => lignesAEnregistrer(lignes), [lignes]);
  const [deplacement, setDeplacement] = useState(depart.deplacement);
  const [margePct, setMargePct] = useState(depart.margePct);
  const [tvaPct, setTvaPct] = useState(depart.tvaPct);
  const [commentaires, setCommentaires] = useState(depart.commentaires);
  const [objet, setObjet] = useState(depart.objet);
  const [validiteJours, setValiditeJours] = useState<string>(depart.validiteJours);
  const [acomptePct, setAcomptePct] = useState<string>(depart.acomptePct);
  const [dateDebut, setDateDebut] = useState(depart.dateDebut);
  const [dureeEstimee, setDureeEstimee] = useState(depart.dureeEstimee);
  const [chantierAilleurs, setChantierAilleurs] = useState(depart.chantierAilleurs);
  const [adresseChantier, setAdresseChantier] = useState(depart.adresseChantier);

  // Mention TVA réduite (08/09) — voir etatDepuisDevis.
  const [mentionTvaReduite, setMentionTvaReduite] = useState(depart.mentionTvaReduite);
  const [mentionModifieeManuellement, setMentionModifieeManuellement] = useState(
    depart.mentionModifieeManuellement
  );

  // Le brouillon local suit chaque modification (un peu après la frappe) ;
  // revenu à l'identique de ce qui est enregistré, il est effacé.
  useEffect(() => {
    const etat: EtatEdition = {
      lignes,
      lots,
      deplacement,
      margePct,
      tvaPct,
      commentaires,
      objet,
      validiteJours,
      acomptePct,
      dateDebut,
      dureeEstimee,
      chantierAilleurs,
      adresseChantier,
      mentionTvaReduite,
      mentionModifieeManuellement,
    };
    const minuteur = setTimeout(() => {
      if (brouillonAbandonne.current || devis.statut !== "brouillon") return;
      if (empreinteEtat(etat) === empreinteEnregistree) effacerBrouillon(cleBrouillon);
      else ecrireBrouillon(cleBrouillon, baseBrouillon, etat);
    }, 400);
    return () => clearTimeout(minuteur);
  }, [
    lignes,
    lots,
    deplacement,
    margePct,
    tvaPct,
    commentaires,
    objet,
    validiteJours,
    acomptePct,
    dateDebut,
    dureeEstimee,
    chantierAilleurs,
    adresseChantier,
    mentionTvaReduite,
    mentionModifieeManuellement,
    devis.statut,
    cleBrouillon,
    baseBrouillon,
    empreinteEnregistree,
  ]);

  function revenirAuDevisEnregistre() {
    brouillonAbandonne.current = true;
    effacerBrouillon(cleBrouillon);
    window.location.reload();
  }

  // Enregistré : le brouillon local n'a plus de raison d'être.
  function abandonnerBrouillon() {
    brouillonAbandonne.current = true;
    effacerBrouillon(cleBrouillon);
  }

  function gestionnaireTvaPct(valeur: number) {
    setTvaPct(valeur);
    if (!mentionModifieeManuellement) {
      setMentionTvaReduite(genererMentionTvaReduite(valeur) ?? "");
    }
  }

  // Anti-oubli (06/09) — suggestions détectées à la génération, déjà
  // chiffrées par le même moteur déterministe que le reste du devis (voir
  // app/api/ai/generer-devis/route.ts). État local uniquement : "Ignorer"
  // fait juste disparaître la suggestion de cet écran, "Ajouter au devis"
  // la déplace dans les lignes normales, éditable comme n'importe quelle
  // autre. Ne survit pas à un rechargement de page une fois traité — la
  // colonne suggestions_oublis en base garde son contenu d'origine, sans
  // conséquence puisque ce bloc ne s'affiche que sur un devis "brouillon".
  const [suggestionsRestantes, setSuggestionsRestantes] = useState<LigneDevisCalculee[]>(
    devis.suggestions_oublis ?? []
  );

  function ajouterPosteFrequent(poste: PosteFrequent) {
    setLignes((prev) => [
      ...prev,
      avecLotParDefaut(
        {
          cle: nouvelleCle(),
          manuelle: true,
          description: poste.description,
          categorie: poste.categorie,
          quantite: 1,
          unite: poste.unite,
          prix_unitaire: poste.prix_unitaire,
          total: poste.prix_unitaire,
          detail_calcul: `Prix repris de votre dernière utilisation — à ajuster si besoin`,
          // Refonte (03/10, duel F lot 4) — un prix qu'il a déjà chiffré lui-même.
          prix_source: "artisan",
        },
        lots
      ),
    ]);
  }

  function ajouterSuggestion(index: number) {
    const suggestion = suggestionsRestantes[index];
    if (!suggestion) return;
    // Origine IA, pas manuelle : cette ligne vient de l'anti-oubli
    // (postes_oublies_probables), simplement acceptée un instant après la
    // génération plutôt qu'au premier chargement.
    setLignes((l) => [...l, avecLotParDefaut({ ...suggestion, cle: nouvelleCle(), manuelle: false }, lots)]);
    setSuggestionsRestantes((prev) => prev.filter((_, i) => i !== index));
  }

  function ignorerSuggestion(index: number) {
    setSuggestionsRestantes((prev) => prev.filter((_, i) => i !== index));
  }

  const totaux = useMemo(
    () => recalculerDevis(lignesPropres, deplacement, margePct, tvaPct),
    [lignesPropres, deplacement, margePct, tvaPct]
  );

  // Le brouillon tel qu'il serait enregistré en validant — mêmes règles
  // que validerDevis, pour que l'aperçu ne mente jamais.
  const sourceApercu = useMemo<SourceDocumentDevis>(() => {
    const validite = Number(validiteJours);
    const acompte = Number(acomptePct);
    return {
      numero: devis.numero,
      lignes: lignesDeVente({
        lignes: lignesPropres,
        deplacement: totaux.deplacement,
        marge_pct: totaux.marge_pct,
        total_estime: totaux.total_ttc,
        montant_tva: totaux.montant_tva,
      }),
      lots,
      total_ht: totaux.total_ht,
      tva_pct: totaux.tva_pct,
      montant_tva: totaux.montant_tva,
      total_estime: totaux.total_ttc,
      commentaires: commentaires.trim() || null,
      mention_tva_reduite: totaux.tva_pct !== 20 ? mentionTvaReduite.trim() || null : null,
      objet: objet.trim() || null,
      adresse_chantier: chantierAilleurs ? adresseChantier.trim() || null : null,
      validite_jours:
        validiteJours.trim() !== "" && Number.isInteger(validite) && validite >= 1 && validite <= 365 ? validite : null,
      date_debut_prevue: dateDebut || null,
      duree_estimee: dureeEstimee.trim() || null,
      acompte_pct: acomptePct.trim() !== "" && Number.isFinite(acompte) && acompte > 0 && acompte <= 100 ? acompte : null,
      created_at: devis.created_at,
      envoye_le: devis.envoye_le,
    };
    // Les mêmes dépendances que l'effet d'aperçu d'avant l'extraction.
  }, [
    devis.numero,
    devis.created_at,
    devis.envoye_le,
    lignesPropres,
    lots,
    totaux,
    commentaires,
    mentionTvaReduite,
    objet,
    chantierAilleurs,
    adresseChantier,
    validiteJours,
    dateDebut,
    dureeEstimee,
    acomptePct,
  ]);

  return {
    // L'état lui-même (et de quoi le modifier)
    lignes,
    setLignes,
    lots,
    setLots,
    deplacement,
    setDeplacement,
    margePct,
    setMargePct,
    tvaPct,
    gestionnaireTvaPct,
    commentaires,
    setCommentaires,
    objet,
    setObjet,
    validiteJours,
    setValiditeJours,
    acomptePct,
    setAcomptePct,
    dateDebut,
    setDateDebut,
    dureeEstimee,
    setDureeEstimee,
    chantierAilleurs,
    setChantierAilleurs,
    adresseChantier,
    setAdresseChantier,
    mentionTvaReduite,
    setMentionTvaReduite,
    setMentionModifieeManuellement,
    // Ce qui s'en déduit
    lignesPropres,
    totaux,
    sourceApercu,
    // Le brouillon local
    retrouve: retrouve !== null,
    revenirAuDevisEnregistre,
    abandonnerBrouillon,
    // L'anti-oubli
    suggestionsRestantes,
    ajouterSuggestion,
    ignorerSuggestion,
    ajouterPosteFrequent,
  };
}

export type EditionDevis = ReturnType<typeof useEditionDevis>;
