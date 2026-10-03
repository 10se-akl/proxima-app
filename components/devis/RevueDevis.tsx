"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron, IconeRetour } from "@/components/projet/icones";
import { ApercuPdf } from "@/components/devis/ApercuPdf";
import { CompletionMention, COMPLETIONS, type ContexteCompletion } from "@/components/devis/CompletionMention";
import { FeuilleLigne } from "@/components/devis/FeuilleLigne";
import { lignesAvecValeur, lignesSansLigne, type TarifsEditeur } from "@/components/devis/EditeurLignes";
import { detailLigne, formatEuros } from "@/components/devis/formatLigne";
import type { EditionDevis } from "@/components/devis/useEditionDevis";
import type { ModeleDevis } from "@/lib/devis/modeleDocument";
import { lignesADoute, type EvaluationDevis, type PointQualite } from "@/lib/devis/qualite";

// ============================================================
// La revue d'un devis sur téléphone (refonte du 03/10, duel F lot 3).
//
// Le devis généré s'ouvre sur ce que Gérard a besoin de voir en deux
// secondes : le client, le total, ce qui manque s'il manque quelque chose,
// les lignes (celles à revoir d'abord, quantité en clair), un seul bouton.
// Tout le reste — conditions, lots, conseils, score — est derrière
// « Modifier tout le devis » : l'ancien éditeur, rien n'est retiré.
//
// Un seul prix par ligne : celui que l'artisan saisit (son prix de revient).
// La ligne « Vos prix … + marge, TVA » recompose le total jusqu'au TTC ; le
// prix que lit le client n'apparaît que dans le PDF.
//
// Aucune rassurance par le vide : une liste sans ligne à revoir est
// simplement une liste. Rien n'est envoyé ici : le bouton valide le devis,
// et c'est l'écran suivant (« Prêt à partir », SuiviDevis) qui l'envoie.
// ============================================================

const LIGNES_AU_PREMIER_ECRAN = 5;

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

const BOUTON_TEXTE = `inline-flex min-h-12 items-center px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 ${FOCUS}`;

const ALERTE = "font-semibold text-signal-fonce dark:text-signal-clair";

// Ce qui manque, dit en deux mots — seuls les points « attention » de la
// conformité (une mention obligatoire, la TVA contradictoire…) arrivent ici.
const TITRE_MANQUE: Record<string, string> = {
  decennale: "Décennale manquante",
  identite: "Identité manquante",
  coordonnees: "Coordonnées manquantes",
  objet: "Objet manquant",
  validite: "Validité manquante",
  tva_contradiction: "TVA contradictoire",
  mention_tva_reduite: "Mention de TVA manquante",
};

function detailManque(point: PointQualite): string {
  if (point.id === "tva_contradiction") return "À corriger avant l'envoi";
  if (["objet", "validite", "mention_tva_reduite"].includes(point.id)) return "À compléter avant l'envoi";
  return "Obligatoire sur un devis";
}

function Rangee({
  principal,
  detail,
  montant,
  fin,
  onClick,
  href,
}: {
  principal: React.ReactNode;
  detail?: React.ReactNode;
  montant?: string;
  fin?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  // La recette de la ligne (langage-interface, règle 7) : 64 px, toute la
  // ligne est la cible.
  const classe = `flex min-h-16 w-full min-w-0 items-center gap-3 rounded-2xl bg-surface px-4 py-2.5 text-left ring-1 ring-ink/15 active:bg-ink/10 sm:hover:bg-ink/5 ${FOCUS}`;
  const contenu = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-ink">{principal}</span>
        {detail && <span className="block truncate text-sm text-steel">{detail}</span>}
      </span>
      {montant && <span className="shrink-0 font-mono text-base tabular-nums text-ink">{montant}</span>}
      {fin}
    </>
  );
  return href ? (
    <Link href={href} className={classe}>
      {contenu}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={classe}>
      {contenu}
    </button>
  );
}

export function RevueDevis({
  edition,
  numero,
  nomClient,
  lienProjet,
  evaluation,
  completion,
  modele,
  tarifs,
  parametresNonConfigures = false,
  enregistrement,
  erreur,
  onValider,
  onToutModifier,
}: {
  edition: EditionDevis;
  numero: string;
  nomClient: string;
  lienProjet: string;
  /** Ce que le score du devis dit aujourd'hui (voir evaluerDevis). */
  evaluation?: EvaluationDevis;
  /** De quoi compléter une mention sur place ; sans lui, la rangée renvoie à l'éditeur. */
  completion?: ContexteCompletion;
  modele: ModeleDevis;
  tarifs?: TarifsEditeur | null;
  /** Le devis a été chiffré avec les valeurs par défaut (tarif horaire, marge, TVA). */
  parametresNonConfigures?: boolean;
  enregistrement: boolean;
  erreur: string | null;
  onValider: () => void;
  onToutModifier: () => void;
}) {
  const { lignes, lignesPropres, totaux, setLignes, retrouve, revenirAuDevisEnregistre, suggestionsRestantes } = edition;
  const [cleOuverte, setCleOuverte] = useState<string | null>(null);
  const [toutVoir, setToutVoir] = useState(false);
  const [recapOuvert, setRecapOuvert] = useState(false);
  const [pdfOuvert, setPdfOuvert] = useState(false);
  const [mentionOuverte, setMentionOuverte] = useState(false);

  // Les lignes signalées d'abord, puis les autres par montant décroissant :
  // ce qui pèse le plus se relit le premier. Un tri stable garde l'ordre du
  // devis entre deux montants égaux.
  const rangees = useMemo(() => {
    const signaux = lignesADoute(lignesPropres, tarifs);
    return lignes
      .map((ligne, i) => ({ ligne, signal: signaux[i] }))
      .sort((a, b) => {
        if (Boolean(a.signal) !== Boolean(b.signal)) return a.signal ? -1 : 1;
        return a.signal ? 0 : b.ligne.total - a.ligne.total;
      });
  }, [lignes, lignesPropres, tarifs]);

  const visibles = toutVoir ? rangees : rangees.slice(0, LIGNES_AU_PREMIER_ECRAN);
  const cachees = rangees.length - visibles.length;
  const ligneOuverte = lignes.find((l) => l.cle === cleOuverte) ?? null;

  // Une mention obligatoire manque : une rangée, la première ; « +1 » s'il y
  // en a d'autres. Les conseils (zone de la décennale, RC Pro…) ne passent
  // pas ici : seul ce qui est exigé sur un devis.
  const manques = (evaluation?.conformite ?? []).filter((p) => p.niveau === "attention");
  const premier = manques[0];
  const sePrecise = premier && completion && COMPLETIONS[premier.id];

  const nombreLignes = lignes.length;

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={lienProjet}
          className={`-ml-2 inline-flex min-h-12 min-w-0 items-center gap-1 rounded-2xl pl-2 pr-3 text-base text-ink ${FOCUS}`}
        >
          <IconeRetour className="h-4 w-4 shrink-0" />
          <span className="truncate">{nomClient}</span>
        </Link>
        <button type="button" onClick={() => setPdfOuvert(true)} className={`-mr-3 shrink-0 ${BOUTON_TEXTE}`}>
          Voir le PDF
        </button>
      </div>

      {/* Rien ne se perd : les modifications gardées sur ce téléphone et
          relues à l'ouverture se disent, avec la sortie (même comportement
          que l'éditeur complet). */}
      {retrouve && (
        <div className="mb-2 rounded-2xl bg-surface px-4 py-1 ring-1 ring-ink/15" role="status">
          <p className="pt-2 text-sm text-ink">Vos modifications ont été retrouvées.</p>
          <button type="button" onClick={revenirAuDevisEnregistre} className={`-ml-3 ${BOUTON_TEXTE}`}>
            Revenir au devis enregistré
          </button>
        </div>
      )}

      <p className="mt-1 text-sm text-steel">Devis n° {numero}</p>
      <p className="mt-0.5 font-display text-3xl font-semibold text-ink">
        <span className="font-mono tabular-nums">{formatEuros(totaux.total_ttc)}</span>{" "}
        <span className="font-sans text-sm font-normal text-steel">TTC</span>
      </p>

      <button
        type="button"
        onClick={() => setRecapOuvert(true)}
        className={`mt-1 flex min-h-12 w-full items-center gap-1 rounded-2xl text-left text-sm text-steel ${FOCUS}`}
      >
        {/* Une ligne, jamais deux : sans « HT » et à interlettrage serré, la
            version la plus longue (avec déplacement) tient à 360 px. */}
        <span className="min-w-0 flex-1 truncate tracking-tight">
          Vos prix {formatEuros(totaux.sous_total_ht)} + {totaux.deplacement > 0 ? "déplacement, " : ""}marge, TVA
        </span>
        <IconeChevron className="h-4 w-4 shrink-0" />
      </button>

      {/* Chiffré sans les tarifs de l'artisan : ses prix sont ceux par
          défaut de Compyo, il doit le savoir avant de valider. */}
      {parametresNonConfigures && (
        <div className="mt-3">
          <Rangee
            principal={<span className={ALERTE}>Paramètres non configurés</span>}
            detail="Prix chiffrés avec des valeurs par défaut"
            href="/dashboard/parametres"
            fin={<IconeChevron className="h-4 w-4 shrink-0 text-steel" />}
          />
        </div>
      )}

      {premier && (
        <div className="mt-3">
          <Rangee
            principal={<span className={ALERTE}>{TITRE_MANQUE[premier.id] ?? premier.libelle}</span>}
            detail={detailManque(premier)}
            href={!sePrecise && premier.lien ? premier.lien.href : undefined}
            onClick={sePrecise ? () => setMentionOuverte(true) : !premier.lien ? onToutModifier : undefined}
            fin={
              <>
                {manques.length > 1 && <span className="shrink-0 text-sm text-steel">+{manques.length - 1}</span>}
                <IconeChevron className="h-4 w-4 shrink-0 text-steel" />
              </>
            }
          />
        </div>
      )}

      <div className="mt-7 flex items-baseline gap-2">
        <h2 className="font-display text-xl font-semibold text-ink">Les lignes</h2>
        <span className="font-sans text-sm tabular-nums text-steel">{nombreLignes}</span>
      </div>

      {nombreLignes === 0 ? (
        <p className="mt-2.5 text-base text-steel">Aucune ligne.</p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          {visibles.map(({ ligne, signal }) => (
            <Rangee
              key={ligne.cle}
              principal={ligne.description.trim() || "Sans description"}
              detail={
                <span className="font-mono tabular-nums">
                  {signal && <span className={`font-sans ${ALERTE}`}>{signal.libelle} · </span>}
                  {detailLigne(ligne)}
                </span>
              }
              montant={formatEuros(ligne.total)}
              onClick={() => setCleOuverte(ligne.cle)}
            />
          ))}
        </div>
      )}

      {cachees > 0 && (
        <button type="button" onClick={() => setToutVoir(true)} className={`mt-1 ${BOUTON_TEXTE}`}>
          Voir {cachees === 1 ? "l'autre" : `les ${cachees} autres`}
        </button>
      )}
      {toutVoir && rangees.length > LIGNES_AU_PREMIER_ECRAN && (
        <button type="button" onClick={() => setToutVoir(false)} className={`mt-1 ${BOUTON_TEXTE}`}>
          Voir moins
        </button>
      )}

      <div className="mt-2">
        <button type="button" onClick={onToutModifier} className={BOUTON_TEXTE}>
          Modifier tout le devis
        </button>
        {/* L'anti-oubli (postes probablement oubliés) vit dans l'éditeur
            complet : on le dit, pour qu'on ne le rate pas. */}
        {suggestionsRestantes.length > 0 && (
          <p className="px-3 text-sm text-steel">
            {suggestionsRestantes.length === 1
              ? "1 poste peut-être oublié"
              : `${suggestionsRestantes.length} postes peut-être oubliés`}
          </p>
        )}
      </div>

      {/* Le bas de l'écran, au-dessus de la barre de navigation : seules les
          lignes défilent, le bouton reste sous le pouce. Le fond couvre le
          rebord de la barre, et laisse la place du « + » qui dépasse
          (même mesure que l'ancien bouton « Valider ce devis »). */}
      <div className="fixed inset-x-0 z-30 border-t border-ink/15 bg-paper px-4 pb-9 pt-3 [bottom:calc(var(--barre-bas,0px)+env(safe-area-inset-bottom)-0.5rem)]">
        {erreur && (
          <p className="mb-2 text-sm font-semibold text-signal-fonce dark:text-signal-clair" role="alert">
            {erreur}
          </p>
        )}
        <Button onClick={onValider} loading={enregistrement} className="min-h-14 w-full">
          {enregistrement ? "Validation…" : "Valider le devis"}
        </Button>
      </div>

      {/* Toucher une ligne : la quantité, le prix, ce que vaut la ligne. */}
      <FeuilleLigne
        ligne={ligneOuverte}
        tarifs={tarifs}
        surFermer={() => setCleOuverte(null)}
        surQuantite={(cle, valeur) => setLignes((prev) => lignesAvecValeur(prev, cle, "quantite", String(valeur), tarifs))}
        surPrix={(cle, valeur) =>
          setLignes((prev) => lignesAvecValeur(prev, cle, "prix_unitaire", String(valeur), tarifs))
        }
        surRetirer={(cle) => {
          setLignes((prev) => lignesSansLigne(prev, cle, tarifs));
          setCleOuverte(null);
        }}
      />

      {/* Du prix de revient au total TTC, ligne par ligne. */}
      <Feuille ouverte={recapOuvert} titre="Du prix au total" surFermer={() => setRecapOuvert(false)}>
        <dl className="flex flex-col">
          {[
            ["Vos prix HT", totaux.sous_total_ht],
            ["Déplacement", totaux.deplacement],
            [`Marge (${totaux.marge_pct} %)`, totaux.montant_marge],
            [`TVA (${totaux.tva_pct} %)`, totaux.montant_tva],
          ].map(([libelle, montant]) => (
            <div key={libelle as string} className="flex min-h-12 items-center justify-between gap-3">
              <dt className="text-base text-ink">{libelle}</dt>
              <dd className="font-mono text-base tabular-nums text-ink">{formatEuros(montant as number)}</dd>
            </div>
          ))}
          <div className="flex min-h-12 items-center justify-between gap-3 border-t border-ink/15">
            <dt className="text-base font-semibold text-ink">Total TTC</dt>
            <dd className="font-mono text-base font-semibold tabular-nums text-ink">{formatEuros(totaux.total_ttc)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-steel">Sur le PDF, la marge est dans chaque prix.</p>
      </Feuille>

      {/* Compléter la mention sur place : l'écriture va dans les mêmes
          paramètres que la page Paramètres, et la rangée disparaît d'elle-même. */}
      <Feuille ouverte={mentionOuverte && Boolean(sePrecise)} titre={premier?.libelle ?? ""} surFermer={() => setMentionOuverte(false)}>
        {premier && completion && (
          <CompletionMention
            pointId={premier.id}
            contexte={{
              ...completion,
              surEnregistre: (parametres) => {
                completion.surEnregistre(parametres);
                setMentionOuverte(false);
              },
            }}
          />
        )}
      </Feuille>

      {/* Le vrai PDF, tel que le client le recevra — fabriqué seulement à
          l'ouverture de la feuille. */}
      <Feuille ouverte={pdfOuvert} titre="Le PDF du devis" surFermer={() => setPdfOuvert(false)} large>
        <ApercuPdf modele={modele} />
      </Feuille>
    </div>
  );
}
