"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { lignesDeVente } from "@/lib/moteur-metier/prixDeVente";
import { obtenirPostesFrequents, type PosteFrequent } from "@/lib/postesFrequents";
import { Card } from "@/components/ui/Card";
import { Field, TextareaField } from "@/components/ui/Input";
import { estColonneManquante, MESSAGE_BASE_PAS_A_JOUR } from "@/lib/supabase/erreurs";
import type { SourceDocumentDevis } from "@/lib/devis/modeleDocument";
import { EditeurLignes } from "@/components/devis/EditeurLignes";
import { useEditionDevis, valeurPositive } from "@/components/devis/useEditionDevis";
import type { Devis, ParametresEntreprise } from "@/types";

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

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
}) {
  const supabase = createClient();

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
  } = useEditionDevis(devis, parametres);
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
        detail: `${formatEuros(totaux.total_ttc)} TTC`,
      });
    }

    onValide();
  }

  return (
    <Card className="mt-4 p-6">
      {/* Renommé le 17/09 (audit des écarts concurrents, §6) : "Validation
          du devis" disait "relis et confirme", pas "modifie". Axel lui-même,
          qui a construit l'écran, en avait conclu qu'on ne pouvait rien y
          écrire — aucun artisan ne l'aurait découvert seul. */}
      <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-1">
        Modifier le devis
      </p>
      <p className="text-xs text-ink/40 mb-5">
        Changez tout ce que vous voulez : lignes, prix, conditions. Rien n&apos;est envoyé au
        client avant que vous validiez.
      </p>

      {retrouve && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 rounded-xl bg-ink/[0.04] px-4 py-2 text-[13.5px] text-ink/75">
          <span className="py-2">Vos modifications non validées ont été retrouvées.</span>
          <button
            type="button"
            onClick={revenirAuDevisEnregistre}
            className="inline-flex min-h-11 items-center font-medium text-ink underline underline-offset-4"
          >
            Revenir au devis enregistré
          </button>
        </div>
      )}

      <div className="mb-5">
        <TextareaField
          label="Objet des travaux"
          rows={2}
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
          placeholder="Ex : Rénovation de la salle de bain avec pose d'une douche à l'italienne."
        />
        <p className="mt-1.5 text-[11px] text-ink/40">
          La première phrase que lit votre client, avant le détail chiffré.
        </p>
      </div>

      {/* Passe visuelle (10/09), guidée par la recherche terrain sur la
          charge mentale des artisans BTP : le Total TTC — le chiffre le
          plus important de tout cet écran, celui qui permet un premier
          "ça a l'air correct" — était auparavant tout en bas, après
          chaque ligne éditable. Un artisan fatigué qui relit un devis le
          soir doit pouvoir le voir en un coup d'œil AVANT de dérouler le
          détail, sans que ce détail (le vrai garde-fou anti-erreur) soit
          raccourci ou retiré pour autant — il reste identique plus bas.
          Recalculé en direct (useMemo totaux) à chaque modification. */}
      <div className="mb-5 rounded-2xl border border-ink/10 bg-paper-warm px-4 py-3.5 flex items-center justify-between">
        <span className="text-xs text-ink/50">Total TTC (mis à jour en direct)</span>
        <span className="font-mono text-xl font-semibold">{formatEuros(totaux.total_ttc)}</span>
      </div>

      {devis.parametres_configures === false && (
        <div className="mb-5 rounded-xl border border-signal/25 bg-signal/5 px-4 py-3">
          <p className="text-sm font-medium text-signal">
            Paramètres d&apos;entreprise non configurés
          </p>
          <p className="mt-1 text-xs text-ink/60">
            Ce devis a été chiffré avec des valeurs par défaut (tarif horaire, marge, TVA) —
            vérifiez qu&apos;elles correspondent bien aux vôtres avant de l&apos;envoyer, ou{" "}
            <a
              href="/dashboard/parametres"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-signal"
            >
              configurez votre entreprise
            </a>{" "}
            puis régénérez-le.
          </p>
        </div>
      )}

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
        <div className="mt-4">
          <p className="text-[11px] font-medium text-ink/40 uppercase tracking-wider mb-2">
            Vos postes fréquents — un clic pour ajouter
          </p>
          <div className="flex flex-wrap gap-2">
            {postesFrequents.map((poste, i) => (
              <button
                key={`${poste.description}-${i}`}
                type="button"
                onClick={() => ajouterPosteFrequent(poste)}
                title={`Déjà utilisé ${poste.nb_utilisations} fois — ${formatEuros(poste.prix_unitaire)}`}
                className="rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink/70 transition-colors hover:border-signal/40 hover:text-signal"
              >
                + {poste.description}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-5 border-t border-ink/10 grid sm:grid-cols-3 gap-4">
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

      <div className="mt-6 pt-5 border-t border-ink/10">
        <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-1">
          Conditions de l&apos;offre
        </p>
        <p className="text-xs text-ink/40 mb-4">
          Reprises de vos paramètres — modifiables pour ce devis seulement.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
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

        <label className="mt-4 flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={chantierAilleurs}
            onChange={(e) => setChantierAilleurs(e.target.checked)}
            className="w-4 h-4 rounded border-ink/25 accent-signal"
          />
          Le chantier est à une autre adresse que celle du client
        </label>
        {chantierAilleurs && (
          <div className="mt-3">
            <Field
              label="Adresse du chantier"
              value={adresseChantier}
              onChange={(e) => setAdresseChantier(e.target.value)}
              placeholder={adresseClient ? `Différente de : ${adresseClient}` : "Adresse complète"}
            />
          </div>
        )}
      </div>

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
          <p className="mt-1.5 text-[11px] text-ink/40 leading-relaxed">
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

      <div className="mt-6 pt-5 border-t border-ink/10 text-sm space-y-1.5">
        <div className="flex items-center justify-between text-ink/60">
          <span>Sous-total HT</span>
          <span className="font-mono">{formatEuros(totaux.sous_total_ht)}</span>
        </div>
        <div className="flex items-center justify-between text-ink/60">
          <span>Déplacement</span>
          <span className="font-mono">{formatEuros(totaux.deplacement)}</span>
        </div>
        {/* Audit "vérification systématique" (10/09) — cette ligne
            manquait ici alors que DevisPreview.tsx l'affiche déjà : sans
            elle, Sous-total HT + Déplacement + TVA ne fait PAS le Total
            TTC affiché juste en dessous (l'écart, c'est la marge) — un
            artisan qui vérifie le calcul à la main sur cet écran précis
            tombait sur un total qu'il ne pouvait pas reconstituer. */}
        <div className="flex items-center justify-between text-ink/60">
          <span>Marge ({totaux.marge_pct}%)</span>
          <span className="font-mono">{formatEuros(totaux.montant_marge)}</span>
        </div>
        <div className="flex items-center justify-between text-ink/60">
          <span>TVA ({totaux.tva_pct}%)</span>
          <span className="font-mono">{formatEuros(totaux.montant_tva)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold pt-2 border-t border-ink/10">
          <span>Total TTC</span>
          <span className="font-mono text-lg">{formatEuros(totaux.total_ttc)}</span>
        </div>
        {/* 17/09 — les prix saisis ici sont vos prix de revient ; le
            client, lui, lit des prix marge incluse (voir prixDeVente.ts).
            Sans cette phrase, l'écart entre les deux écrans surprendrait. */}
        <p className="pt-2 text-[11px] text-ink/40 leading-relaxed">
          Vous saisissez vos prix de revient. Sur le devis du client, la marge est
          répartie dans le prix de chaque ligne et le déplacement apparaît en ligne à
          part : il ne voit jamais votre marge, et ses lignes tombent juste sur le total.
        </p>
      </div>

      {suggestionsRestantes.length > 0 && (
        <div className="mt-6 pt-5 border-t border-ink/10">
          <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-1">
            Postes probablement oubliés
          </p>
          <p className="text-xs text-ink/40 mb-3">
            Déjà chiffrés selon vos paramètres — à vous de juger si c&apos;est pertinent ici.
          </p>
          <div className="flex flex-col gap-2">
            {suggestionsRestantes.map((s, i) => (
              <div
                key={`${s.description}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink/80 truncate">{s.description}</p>
                  <p className="text-xs text-ink/40 font-mono">{formatEuros(s.total)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => ajouterSuggestion(i)}
                    className="text-xs font-medium text-signal hover:text-signal-fonce transition-colors"
                  >
                    + Ajouter au devis
                  </button>
                  <button
                    type="button"
                    onClick={() => ignorerSuggestion(i)}
                    className="text-xs text-ink/40 hover:text-ink/60 underline transition-colors"
                  >
                    Ignorer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 27/09 — Sur téléphone, un devis de vingt lignes faisait défiler
          longtemps avant de trouver « Valider ». Le bouton reste sous le
          pouce, au-dessus de la barre du bas, avec le total à jour ; une
          erreur s'affiche juste au-dessus de lui, là où on regarde. */}
      <div className="sticky bottom-[calc(var(--barre-bas,0px)+env(safe-area-inset-bottom)+1.75rem)] z-10 mt-5 sm:static">
        {erreur && (
          <p className="mb-2 rounded-xl bg-surface px-3 py-2 text-sm text-signal-fonce ring-1 ring-signal/30 dark:text-signal-clair sm:bg-transparent sm:p-0 sm:ring-0">
            {erreur}
          </p>
        )}
        <button
          type="button"
          onClick={validerDevis}
          disabled={enregistrement}
          className="flex w-full min-h-14 items-center justify-between gap-3 rounded-2xl bg-ink px-5 text-paper shadow-[0_10px_30px_-12px_rgb(var(--c-ink)/0.6)] transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 sm:w-auto sm:justify-center sm:shadow-none"
        >
          <span className="text-[16px] font-semibold">{enregistrement ? "Validation…" : "Valider ce devis"}</span>
          <span className="font-mono text-[15px] tabular-nums text-paper/80 sm:hidden">{formatEuros(totaux.total_ttc)}</span>
        </button>
      </div>
    </Card>
  );
}
