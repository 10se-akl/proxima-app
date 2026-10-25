"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { lignesDeVente } from "@/lib/moteur-metier/prixDeVente";
import { obtenirPostesFrequents, type PosteFrequent } from "@/lib/postesFrequents";
import { Field, TextareaField } from "@/components/ui/Input";
import { estColonneManquante, MESSAGE_BASE_PAS_A_JOUR } from "@/lib/supabase/erreurs";
import type { ModeleDevis, SourceDocumentDevis } from "@/lib/devis/modeleDocument";
import { EditeurLignes } from "@/components/devis/EditeurLignes";
import { IconePlus, IconeRetour } from "@/components/projet/icones";
import { AIDE, BOUTON_CREUX, BOUTON_TEXTE, CARTE_PLEINE, CASE, COMPTEUR, CREUX, FOCUS, GROUPE, MONTANT, SECONDAIRE, TITRE_SECTION, euros, puce, BOUTON_TEXTE_DISCRET } from "@/components/ui/recettes";
import { RevueDevis } from "@/components/devis/RevueDevis";
import type { ContexteCompletion } from "@/components/devis/CompletionMention";
import { useEditionDevis, valeurPositive } from "@/components/devis/useEditionDevis";
import type { EvaluationDevis } from "@/lib/devis/qualite";
import type { Devis, ParametresEntreprise } from "@/types";

// Design v3 (24/10) : un montant ne se coupe jamais (espaces insécables).
const formatEuros = (n: number) => euros(n, true);

// Le bouton « Valider » : le seul plein de l'écran. Sur téléphone, il porte
// le total à droite ; sur ordinateur, il reprend sa largeur naturelle.
// 25/10 : rayon 20, la forme de tout grand bouton (recettes.ts).
const BOUTON_VALIDER = `flex min-h-14 w-full items-center justify-between gap-3 rounded-[20px] bg-ink px-5 text-paper active:bg-ink/85 sm:w-auto sm:justify-center sm:hover:bg-ink/90 motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;

// Refonte (03/10, duel F lot 3) — de quoi afficher la revue sur téléphone
// (components/devis/RevueDevis.tsx), que l'espace devis connaît et que cet
// écran ignorait : le client, le score à jour, le PDF. Sans cet objet,
// l'écran reste exactement l'éditeur d'avant, sur téléphone aussi.
export type RevueTelephone = {
  nomClient: string;
  lienProjet: string;
  evaluation: EvaluationDevis;
  completion?: ContexteCompletion;
  modele: ModeleDevis;
};

// Étape intermédiaire entre "l'IA + le moteur métier ont préparé un
// brouillon" et "le PDF part au client". L'artisan relit, ajuste
// chaque ligne si besoin, et valide explicitement — jamais d'export
// PDF généré directement depuis un brouillon non relu.
//
// Refonte (03/10, duel F lot 2) — l'état de l'édition (lignes, conditions,
// brouillon local, totaux) vit désormais dans components/devis/
// useEditionDevis.ts ; cet écran ne garde que l'affichage et l'écriture de
// la validation.
export function ValiderDevis({
  devis,
  demandeId,
  artisanId,
  parametres,
  adresseClient,
  onValide,
  onApercu,
  revue,
  score,
}: {
  devis: Devis;
  demandeId: string;
  artisanId: string;
  parametres?: ParametresEntreprise | null;
  adresseClient?: string | null;
  onValide: () => void;
  // Espace devis (17/09) : reçoit le brouillon à chaque modification, pour
  // que le vrai PDF affiché à côté suive en direct.
  onApercu?: (source: SourceDocumentDevis) => void;
  // Refonte (03/10, duel F lot 3) : sur téléphone, la revue remplace
  // l'éditeur ; « Modifier tout le devis » ramène l'éditeur, avec le score
  // au-dessus (l'ordinateur voit toujours l'éditeur et le score).
  revue?: RevueTelephone;
  score?: React.ReactNode;
}) {
  const supabase = createClient();
  // Sur téléphone seulement : l'artisan a demandé l'éditeur complet.
  const [toutModifier, setToutModifier] = useState(false);
  const revueAffichee = Boolean(revue) && !toutModifier;

  const edition = useEditionDevis(devis, parametres);
  const {
    lignes,
    setLignes,
    lots,
    setLots,
    lignesPropres,
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
    totaux,
    sourceApercu,
    retrouve,
    revenirAuDevisEnregistre,
    abandonnerBrouillon,
    suggestionsRestantes,
    ajouterSuggestion,
    ignorerSuggestion,
    ajouterPosteFrequent,
  } = edition;
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Postes fréquents (08/09) — voir lib/postesFrequents.ts : les propres
  // postes déjà utilisés par cet artisan dans ses devis récents, pas une
  // bibliothèque de prix générique. Chargé une fois au montage, best-effort
  // (une liste vide en cas d'échec ne doit jamais bloquer la validation du
  // devis, qui reste l'action principale de cet écran).
  const [postesFrequents, setPostesFrequents] = useState<PosteFrequent[]>([]);

  useEffect(() => {
    let annule = false;
    (async () => {
      const organisationId = await getOrganisationId(supabase, artisanId);
      if (!organisationId || annule) return;
      const postes = await obtenirPostesFrequents(supabase, organisationId, demandeId);
      if (!annule) setPostesFrequents(postes);
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le vrai PDF affiché à côté suit chaque modification (voir sourceApercu
  // dans useEditionDevis : le brouillon tel qu'il serait enregistré).
  useEffect(() => {
    onApercu?.(sourceApercu);
  }, [onApercu, sourceApercu]);

  async function validerDevis() {
    setErreur(null);

    // Un devis sans ligne (tout supprimé par erreur) ou à 0€ n'a rien à
    // faire chez un client — mieux vaut le dire clairement maintenant que
    // de laisser l'artisan l'envoyer sans s'en apercevoir.
    if (lignes.length === 0) {
      setErreur("Ajoutez au moins une ligne avant de valider ce devis.");
      return;
    }
    const ligneSansDescription = lignes.some((l) => !l.description.trim());
    if (ligneSansDescription) {
      setErreur("Une ligne n'a pas de description — complétez-la avant de valider.");
      return;
    }
    // "<= 0" ne suffit pas : NaN <= 0 vaut false en JavaScript, donc un
    // total corrompu passerait ce contrôle. On vérifie explicitement que
    // le total est un nombre fini.
    if (!Number.isFinite(totaux.total_ttc) || totaux.total_ttc <= 0) {
      setErreur("Le total du devis est à 0 € (ou invalide) — vérifiez les prix unitaires avant de valider.");
      return;
    }

    const validite = validiteJours.trim() === "" ? null : Number(validiteJours);
    if (validite !== null && (!Number.isInteger(validite) || validite < 1 || validite > 365)) {
      setErreur("La durée de validité doit être un nombre de jours entre 1 et 365.");
      return;
    }
    const acompte = acomptePct.trim() === "" ? null : Number(acomptePct);
    if (acompte !== null && (!Number.isFinite(acompte) || acompte < 0 || acompte > 100)) {
      setErreur("L'acompte doit être un pourcentage entre 0 et 100.");
      return;
    }
    const lotsUtilises = lots.filter((lot) => lignesPropres.some((l) => l.lot_id === lot.id));
    if (lotsUtilises.some((lot) => !lot.nom.trim())) {
      setErreur("Donnez un nom à chaque lot — c'est le titre que lira votre client.");
      return;
    }
    if (chantierAilleurs && !adresseChantier.trim()) {
      setErreur("Indiquez l'adresse du chantier, ou décochez « Le chantier est à une autre adresse ».");
      return;
    }

    setEnregistrement(true);

    // Les lignes telles que le client les lira, figées avec le reste
    // (Module 42) : c'est tout ce que la page de signature reçoit.
    // Un lot vide n'a rien à faire en base ; une ligne qui pointerait vers
    // un lot disparu redevient simplement "hors lot".
    const idsLots = new Set(lotsUtilises.map((l) => l.id));
    const lignesFinales = lignesPropres.map((l) =>
      l.lot_id && !idsLots.has(l.lot_id) ? { ...l, lot_id: null } : l
    );
    const lotsFinaux = lotsUtilises.map((l) => ({ ...l, nom: l.nom.trim() }));

    const lignesVente = lignesDeVente({
      lignes: lignesFinales,
      deplacement: totaux.deplacement,
      marge_pct: totaux.marge_pct,
      total_estime: totaux.total_ttc,
      montant_tva: totaux.montant_tva,
    });

    const { error } = await supabase
      .from("devis")
      .update({
        lignes: lignesFinales,
        lots: lotsFinaux,
        lignes_vente: lignesVente,
        sous_total_ht: totaux.sous_total_ht,
        deplacement: totaux.deplacement,
        marge_pct: totaux.marge_pct,
        tva_pct: totaux.tva_pct,
        montant_tva: totaux.montant_tva,
        total_estime: totaux.total_ttc,
        commentaires: commentaires || null,
        mention_tva_reduite: totaux.tva_pct !== 20 ? mentionTvaReduite.trim() || null : null,
        objet: objet.trim() || null,
        adresse_chantier: chantierAilleurs ? adresseChantier.trim() : null,
        validite_jours: validite,
        date_debut_prevue: dateDebut || null,
        duree_estimee: dureeEstimee.trim() || null,
        acompte_pct: acompte,
        statut: "a_valider",
      })
      .eq("id", devis.id);

    setEnregistrement(false);

    if (error) {
      console.error("Validation du devis :", error);
      setErreur(
        estColonneManquante(error)
          ? MESSAGE_BASE_PAS_A_JOUR
          : "Impossible d'enregistrer les modifications. Réessayez."
      );
      return;
    }

    // Enregistré : le brouillon local n'a plus de raison d'être.
    abandonnerBrouillon();

    const organisationId = await getOrganisationId(supabase, artisanId);
    if (organisationId) {
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId,
        organisationId,
        type: "devis_valide",
        titre: "Devis validé",
        detail: `${totaux.total_ttc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} TTC`,
      });
    }

    onValide();
  }

  function afficherToutModifier(oui: boolean) {
    setToutModifier(oui);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      {/* Refonte (03/10, duel F lot 3) — sur téléphone, la revue ; sur
          ordinateur, jamais (l'éditeur ci-dessous reste l'écran). Quand
          l'artisan a demandé l'éditeur complet, la revue s'efface. */}
      {revue && (
        <div className={toutModifier ? "hidden" : "sm:hidden"}>
          <RevueDevis
            edition={edition}
            numero={devis.numero}
            nomClient={revue.nomClient}
            lienProjet={revue.lienProjet}
            evaluation={revue.evaluation}
            completion={revue.completion}
            modele={revue.modele}
            tarifs={parametres ?? null}
            parametresNonConfigures={devis.parametres_configures === false}
            enregistrement={enregistrement}
            erreur={erreur}
            onValider={validerDevis}
            onToutModifier={() => afficherToutModifier(true)}
          />
        </div>
      )}

      <div className={revueAffichee ? "max-sm:hidden" : undefined}>
        {/* Le score (points à vérifier) : au-dessus de l'éditeur, comme
            avant ; sur téléphone, il n'apparaît qu'avec l'éditeur complet. */}
        {score}

        {/* Design v3 (24/10) — l'éditeur n'est plus une seule grande carte
            bordée : des blocs posés sur le fond, chacun avec son titre
            (le total, l'objet, les lignes, les prix, les conditions, le
            récapitulatif), comme le reste de l'application. Même contenu,
            même ordre. */}
        <div className={`flex flex-col gap-8 ${score ? "mt-8" : ""}`}>
          <div>
            {revue && (
              <button
                type="button"
                onClick={() => afficherToutModifier(false)}
                className={`${BOUTON_TEXTE} -ml-3 mb-1 gap-1 sm:hidden`}
              >
                <IconeRetour className="h-4 w-4" />
                Revenir à la revue
              </button>
            )}
            {/* Renommé le 17/09 (audit des écarts concurrents, §6) : "Validation
                du devis" disait "relis et confirme", pas "modifie". Axel lui-même,
                qui a construit l'écran, en avait conclu qu'on ne pouvait rien y
                écrire — aucun artisan ne l'aurait découvert seul. */}
            <h2 className={`${TITRE_SECTION} [text-wrap:balance]`}>Modifier le devis</h2>
            <p className={`${SECONDAIRE} mt-1 [text-wrap:pretty]`}>
              Changez tout ce que vous voulez : lignes, prix, conditions. Rien n&apos;est envoyé au
              client avant que vous validiez.
            </p>

            {retrouve && (
              <div className={`${CREUX} mt-4 flex flex-wrap items-center gap-x-3 px-4 py-1`}>
                <span className="py-2 text-[15px] text-ink">Vos modifications non validées ont été retrouvées.</span>
                <button type="button" onClick={revenirAuDevisEnregistre} className={`${BOUTON_TEXTE} -ml-3`}>
                  Revenir au devis enregistré
                </button>
              </div>
            )}
          </div>

          {/* Passe visuelle (10/09), guidée par la recherche terrain sur la
              charge mentale des artisans BTP : le Total TTC — le chiffre le
              plus important de tout cet écran, celui qui permet un premier
              "ça a l'air correct" — était auparavant tout en bas, après
              chaque ligne éditable. Un artisan fatigué qui relit un devis le
              soir doit pouvoir le voir en un coup d'œil AVANT de dérouler le
              détail, sans que ce détail (le vrai garde-fou anti-erreur) soit
              raccourci ou retiré pour autant — il reste identique plus bas.
              Recalculé en direct (useMemo totaux) à chaque modification.
              Design v3 (24/10) : le gros chiffre, 32 px, comme « À encaisser ». */}
          <div className={CARTE_PLEINE}>
            <p className="text-[15px] text-steel">Total TTC&nbsp;· mis à jour en direct</p>
            <p className={`mt-1 text-[32px] leading-tight tracking-[-0.03em] ${MONTANT} font-bold`}>
              {formatEuros(totaux.total_ttc)}
            </p>
          </div>

          {devis.parametres_configures === false && (
            <div className="rounded-[20px] bg-alerte-fond px-5 py-4">
              <p className="text-base font-semibold text-alerte-orange">Paramètres d&apos;entreprise non configurés</p>
              <p className="mt-1 text-[15px] text-ink [text-wrap:pretty]">
                Ce devis a été chiffré avec des valeurs par défaut (tarif horaire, marge, TVA) —
                vérifiez qu&apos;elles correspondent bien aux vôtres avant de l&apos;envoyer, ou{" "}
                <a
                  href="/dashboard/parametres"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-semibold underline decoration-ink/30 underline-offset-4 ${FOCUS}`}
                >
                  configurez votre entreprise
                </a>{" "}
                puis régénérez-le.
              </p>
            </div>
          )}

          <div className={CARTE_PLEINE}>
            <TextareaField
              label="Objet des travaux"
              rows={2}
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex : Rénovation de la salle de bain avec pose d'une douche à l'italienne."
            />
            <p className={AIDE}>La première phrase que lit votre client, avant le détail chiffré.</p>
          </div>

          <section>
            <h2 className={`${TITRE_SECTION} mb-3 flex items-baseline gap-2`}>
              Les lignes <span className={COMPTEUR}>{lignes.length}</span>
            </h2>
            <EditeurLignes
              lignes={lignes}
              lots={lots}
              tarifs={parametres ?? null}
              onChange={(nouvellesLignes, nouveauxLots) => {
                setLignes(nouvellesLignes);
                setLots(nouveauxLots);
              }}
            />

            {postesFrequents.length > 0 && (
              <div className="mt-5">
                <p className={`${SECONDAIRE} mb-2`}>Vos postes fréquents — un appui pour ajouter</p>
                <div className="flex flex-wrap gap-2">
                  {postesFrequents.map((poste, i) => (
                    <button
                      key={`${poste.description}-${i}`}
                      type="button"
                      onClick={() => ajouterPosteFrequent(poste)}
                      title={`Déjà utilisé ${poste.nb_utilisations} fois — ${formatEuros(poste.prix_unitaire)}`}
                      className={`${puce(false)} max-w-full gap-1.5 py-1.5`}
                    >
                      <IconePlus className="h-4 w-4 shrink-0" />
                      {/* Un libellé de bouton ne se coupe pas : deux lignes au plus. */}
                      <span className="line-clamp-2 break-words text-center">{poste.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className={`${TITRE_SECTION} mb-3`}>Prix et marge</h2>
            <div className={`${CARTE_PLEINE} grid gap-4 sm:grid-cols-3`}>
              <Field
                label="Déplacement (€)"
                type="number"
                step="0.01"
                min={0}
                value={deplacement}
                onChange={(e) => setDeplacement(valeurPositive(e.target.value))}
              />
              <Field
                label="Marge (%)"
                type="number"
                step="0.01"
                min={0}
                value={margePct}
                onChange={(e) => setMargePct(valeurPositive(e.target.value))}
              />
              <Field
                label="TVA (%)"
                type="number"
                step="0.01"
                min={0}
                value={tvaPct}
                onChange={(e) => gestionnaireTvaPct(valeurPositive(e.target.value))}
              />
            </div>
          </section>

          <section>
            <h2 className={`${TITRE_SECTION} [text-wrap:balance]`}>Conditions de l&apos;offre</h2>
            <p className={`${SECONDAIRE} mb-3 mt-1 [text-wrap:pretty]`}>
              Reprises de vos paramètres — modifiables pour ce devis seulement.
            </p>
            <div className={CARTE_PLEINE}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Validité (jours)"
                  type="number"
                  step="1"
                  min={1}
                  max={365}
                  value={validiteJours}
                  onChange={(e) => setValiditeJours(e.target.value)}
                />
                <Field
                  label="Acompte à la signature (%)"
                  type="number"
                  step="1"
                  min={0}
                  max={100}
                  value={acomptePct}
                  onChange={(e) => setAcomptePct(e.target.value)}
                  placeholder="Aucun"
                />
                <Field
                  label="Début des travaux prévu"
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                />
                <Field
                  label="Durée estimée"
                  value={dureeEstimee}
                  onChange={(e) => setDureeEstimee(e.target.value)}
                  placeholder="Ex : 3 jours"
                />
              </div>

              {/* Toute la ligne est la cible (48 px), la case est grande. */}
              <label className="mt-4 flex min-h-12 cursor-pointer items-center gap-3 text-base text-ink">
                <input
                  type="checkbox"
                  checked={chantierAilleurs}
                  onChange={(e) => setChantierAilleurs(e.target.checked)}
                  className={CASE}
                />
                Le chantier est à une autre adresse que celle du client
              </label>
              {chantierAilleurs && (
                <div className="mt-2">
                  <Field
                    label="Adresse du chantier"
                    value={adresseChantier}
                    onChange={(e) => setAdresseChantier(e.target.value)}
                    placeholder={adresseClient ? `Différente de : ${adresseClient}` : "Adresse complète"}
                  />
                </div>
              )}

              {tvaPct !== 20 && (
                <div className="mt-5">
                  <TextareaField
                    label="Mention TVA réduite (visible sur le devis puis la facture)"
                    rows={3}
                    value={mentionTvaReduite}
                    onChange={(e) => {
                      setMentionTvaReduite(e.target.value);
                      setMentionModifieeManuellement(true);
                    }}
                  />
                  <p className={AIDE}>
                    Texte suggéré à titre indicatif — la formulation officielle exacte n&apos;est pas
                    garantie, à vérifier avec votre comptable avant un premier envoi.
                  </p>
                </div>
              )}

              <div className="mt-5">
                <TextareaField
                  label="Commentaires (optionnel, visible sur le devis)"
                  rows={2}
                  value={commentaires}
                  onChange={(e) => setCommentaires(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className={`${TITRE_SECTION} mb-3`}>Récapitulatif</h2>
            <div className={CARTE_PLEINE}>
              <dl className="flex flex-col">
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <dt className="text-[15px] text-steel">Sous-total HT</dt>
                  <dd className="whitespace-nowrap text-base tabular-nums text-ink">{formatEuros(totaux.sous_total_ht)}</dd>
                </div>
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <dt className="text-[15px] text-steel">Déplacement</dt>
                  <dd className="whitespace-nowrap text-base tabular-nums text-ink">{formatEuros(totaux.deplacement)}</dd>
                </div>
                {/* Audit "vérification systématique" (10/09) — cette ligne
                    manquait ici alors que DevisPreview.tsx l'affiche déjà : sans
                    elle, Sous-total HT + Déplacement + TVA ne fait PAS le Total
                    TTC affiché juste en dessous (l'écart, c'est la marge) — un
                    artisan qui vérifie le calcul à la main sur cet écran précis
                    tombait sur un total qu'il ne pouvait pas reconstituer. */}
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <dt className="text-[15px] text-steel">Marge ({totaux.marge_pct}&nbsp;%)</dt>
                  <dd className="whitespace-nowrap text-base tabular-nums text-ink">{formatEuros(totaux.montant_marge)}</dd>
                </div>
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <dt className="text-[15px] text-steel">TVA ({totaux.tva_pct}&nbsp;%)</dt>
                  <dd className="whitespace-nowrap text-base tabular-nums text-ink">{formatEuros(totaux.montant_tva)}</dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-gris-clair pt-3">
                  <dt className="text-[17px] font-semibold text-ink">Total TTC</dt>
                  <dd className={`whitespace-nowrap text-[28px] leading-tight tracking-[-0.02em] ${MONTANT} font-bold`}>
                    {formatEuros(totaux.total_ttc)}
                  </dd>
                </div>
              </dl>
              {/* 17/09 — les prix saisis ici sont vos prix de revient ; le
                  client, lui, lit des prix marge incluse (voir prixDeVente.ts).
                  Sans cette phrase, l'écart entre les deux écrans surprendrait. */}
              <p className={`${AIDE} mt-3 [text-wrap:pretty]`}>
                Vous saisissez vos prix de revient. Sur le devis du client, la marge est
                répartie dans le prix de chaque ligne et le déplacement apparaît en ligne à
                part : il ne voit jamais votre marge, et ses lignes tombent juste sur le total.
              </p>
            </div>
          </section>

          {suggestionsRestantes.length > 0 && (
            <section>
              <h2 className={`${TITRE_SECTION} [text-wrap:balance]`}>Postes probablement oubliés</h2>
              <p className={`${SECONDAIRE} mb-3 mt-1 [text-wrap:pretty]`}>
                Déjà chiffrés selon vos paramètres — à vous de juger si c&apos;est pertinent ici.
              </p>
              <div className={GROUPE}>
                {suggestionsRestantes.map((s, i) => (
                  <div key={`${s.description}-${i}`} className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-base font-semibold text-ink">{s.description}</p>
                      <p className="text-[15px] tabular-nums text-steel">{formatEuros(s.total)}</p>
                    </div>
                    <div className="-mr-3 flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => ignorerSuggestion(i)} className={BOUTON_TEXTE_DISCRET}>
                        Ignorer
                      </button>
                      <button
                        type="button"
                        onClick={() => ajouterSuggestion(i)}
                        className={`${BOUTON_CREUX} text-[15px]`}
                      >
                        <IconePlus className="h-4 w-4" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 27/09 — Sur téléphone, un devis de vingt lignes faisait défiler
              longtemps avant de trouver « Valider ». Le bouton reste sous le
              pouce, au-dessus de la barre du bas, avec le total à jour ; une
              erreur s'affiche juste au-dessus de lui, là où on regarde.
              Design v3 (24/10) : le seul bouton plein de l'écran, sans halo. */}
          <div className="sticky bottom-[calc(var(--barre-bas,0px)+env(safe-area-inset-bottom)+1.75rem)] z-10 sm:static">
            {erreur && (
              <p
                role="alert"
                className="mb-2 rounded-[20px] bg-surface px-4 py-3 text-[15px] font-semibold text-signal-fonce ring-1 ring-inset ring-gris-clair sm:bg-transparent sm:p-0 sm:ring-0"
              >
                {erreur}
              </p>
            )}
            <button type="button" onClick={validerDevis} disabled={enregistrement} className={BOUTON_VALIDER}>
              {/* Refonte (03/10, duel F lot 3) — sur ordinateur, ce bouton valide
                  sans rien envoyer : l'envoi est l'étape suivante (« Prêt à
                  partir »). Le dire évite de chercher « Envoyer » ici. */}
              <span className="text-[17px] font-semibold">
                {enregistrement ? (
                  "Validation…"
                ) : (
                  <>
                    <span className="sm:hidden">Valider ce devis</span>
                    <span className="hidden sm:inline">Valider sans l&apos;envoyer</span>
                  </>
                )}
              </span>
              <span className="whitespace-nowrap text-base font-semibold tabular-nums sm:hidden">
                {formatEuros(totaux.total_ttc)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
