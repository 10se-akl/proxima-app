"use client";

import { useId, useState } from "react";
import { Feuille } from "@/components/projet/Feuille";
import {
  estLigneAjustementMinimum,
  estUniteDemiJournee,
  estUniteHeure,
  estUniteJour,
} from "@/lib/moteur-metier/tempsMainOeuvre";
import type { LigneEditee, TarifsEditeur } from "@/components/devis/EditeurLignes";
import { formatEuros, libellePrix, nombreSaisi, texteDepuisNombre } from "@/components/devis/formatLigne";

// ============================================================
// La feuille d'une ligne (refonte du 03/10, duel F lot 3) : toucher une
// ligne de la revue ouvre ceci — la quantité (− / + de 56 px, ou au clavier),
// le prix, ce que vaut la ligne, et c'est tout. Le reste de la ligne (sa
// description, son unité, son lot) se change dans « Modifier tout le devis ».
//
// Chaque frappe est appliquée tout de suite à l'état de l'édition (voir
// useEditionDevis), donc au total, à l'aperçu et au brouillon gardé sur le
// téléphone : fermer la feuille d'un geste (voile, retour, croix) ne perd
// rien. « Enregistrer » ne fait que la refermer — rien n'est écrit en base
// avant « Valider ».
//
// On garde ici le TEXTE tapé (« 12, » ou « » en cours de frappe), et on ne
// pousse que des nombres : sinon le champ sauterait à chaque touche.
// ============================================================

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

const BOUTON_PAS = `grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-surface font-mono text-2xl font-semibold text-ink ring-1 ring-inset ring-ink/30 active:bg-ink/10 ${FOCUS}`;

const CHAMP =
  "flex h-14 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-paper px-4 ring-1 ring-inset ring-ink/30 focus-within:ring-2 focus-within:ring-ink";

export function FeuilleLigne({
  ligne,
  tarifs,
  surFermer,
  surQuantite,
  surPrix,
  surRetirer,
}: {
  ligne: LigneEditee | null;
  tarifs?: TarifsEditeur | null;
  surFermer: () => void;
  surQuantite: (cle: string, valeur: number) => void;
  surPrix: (cle: string, valeur: number) => void;
  surRetirer: (cle: string) => void;
}) {
  return (
    <Feuille ouverte={ligne !== null} titre={ligne?.description.trim() || "Cette ligne"} surFermer={surFermer}>
      {ligne && (
        // Une feuille neuve par ligne : les textes tapés ne passent pas de
        // l'une à l'autre.
        <ContenuLigne
          key={ligne.cle}
          ligne={ligne}
          tarifs={tarifs}
          surFermer={surFermer}
          surQuantite={surQuantite}
          surPrix={surPrix}
          surRetirer={surRetirer}
        />
      )}
    </Feuille>
  );
}

function ContenuLigne({
  ligne,
  tarifs,
  surFermer,
  surQuantite,
  surPrix,
  surRetirer,
}: {
  ligne: LigneEditee;
  tarifs?: TarifsEditeur | null;
  surFermer: () => void;
  surQuantite: (cle: string, valeur: number) => void;
  surPrix: (cle: string, valeur: number) => void;
  surRetirer: (cle: string) => void;
}) {
  const idQuantite = useId();
  const idPrix = useId();
  const [texteQuantite, setTexteQuantite] = useState(() => texteDepuisNombre(ligne.quantite));
  const [textePrix, setTextePrix] = useState(() => texteDepuisNombre(ligne.prix_unitaire));
  const [question, setQuestion] = useState(false);

  // Calculée par Compyo pour atteindre le minimum d'heures : elle suit les
  // heures réelles toute seule (voir EditeurLignes). On ne la règle pas ici.
  const calculee = Boolean(tarifs) && estLigneAjustementMinimum(ligne);
  // Un temps se compte au demi : un jour, c'est rarement 2 ou 3 pile.
  const pas = estUniteJour(ligne.unite) || estUniteHeure(ligne.unite) || estUniteDemiJournee(ligne.unite) ? 0.5 : 1;

  function taperQuantite(texte: string) {
    setTexteQuantite(texte);
    const n = nombreSaisi(texte);
    if (n !== null) surQuantite(ligne.cle, n);
  }

  function taperPrix(texte: string) {
    setTextePrix(texte);
    const n = nombreSaisi(texte);
    if (n !== null) surPrix(ligne.cle, n);
  }

  function bougerQuantite(sens: 1 | -1) {
    const n = Math.max(0, Math.round((ligne.quantite + sens * pas) * 100) / 100);
    setTexteQuantite(texteDepuisNombre(n));
    surQuantite(ligne.cle, n);
  }

  return (
    <div>
      {calculee ? (
        <p className="text-base text-steel">Calculée pour atteindre votre minimum d&apos;heures.</p>
      ) : (
        <>
          <div>
            <label htmlFor={idQuantite} className="text-sm text-steel">
              Quantité
            </label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => bougerQuantite(-1)}
                aria-label="Une unité de moins"
                disabled={ligne.quantite <= 0}
                className={`${BOUTON_PAS} disabled:opacity-40`}
              >
                −
              </button>
              <div className={CHAMP}>
                <input
                  id={idQuantite}
                  value={texteQuantite}
                  onChange={(e) => taperQuantite(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => setTexteQuantite(texteDepuisNombre(ligne.quantite))}
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent font-mono text-xl tabular-nums text-ink outline-none"
                />
                <span className="shrink-0 text-sm text-steel">{ligne.unite}</span>
              </div>
              <button type="button" onClick={() => bougerQuantite(1)} aria-label="Une unité de plus" className={BOUTON_PAS}>
                +
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor={idPrix} className="text-sm text-steel">
              {libellePrix(ligne.unite)}
            </label>
            <div className={`${CHAMP} mt-1 w-full flex-none`}>
              <input
                id={idPrix}
                value={textePrix}
                onChange={(e) => taperPrix(e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={() => setTextePrix(texteDepuisNombre(ligne.prix_unitaire))}
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent font-mono text-xl tabular-nums text-ink outline-none"
              />
              <span className="shrink-0 text-sm text-steel">€</span>
            </div>
          </div>
        </>
      )}

      <div className="mt-4 flex min-h-12 items-baseline justify-between gap-3">
        <span className="text-sm text-steel">Cette ligne</span>
        <span className="font-mono text-xl font-semibold tabular-nums text-ink">{formatEuros(ligne.total)}</span>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={surFermer}
          className={`min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 ${FOCUS}`}
        >
          Enregistrer
        </button>

        {question ? (
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-ink/15">
            <p className="text-base font-semibold text-ink">Retirer cette ligne ?</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => surRetirer(ligne.cle)}
                className={`min-h-12 w-full rounded-2xl px-4 text-base font-semibold text-signal-fonce ring-1 ring-inset ring-signal-fonce/50 active:bg-signal-fonce/10 dark:text-signal-clair dark:ring-signal-clair/50 ${FOCUS}`}
              >
                Oui, la retirer
              </button>
              <button
                type="button"
                onClick={() => setQuestion(false)}
                className={`min-h-12 w-full px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 ${FOCUS}`}
              >
                Non, la garder
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setQuestion(true)}
            className={`min-h-12 w-full rounded-2xl px-4 text-base font-semibold text-signal-fonce ring-1 ring-inset ring-signal-fonce/50 active:bg-signal-fonce/10 dark:text-signal-clair dark:ring-signal-clair/50 ${FOCUS}`}
          >
            Retirer cette ligne
          </button>
        )}
      </div>
    </div>
  );
}
