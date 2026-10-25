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
import { libellePrix, nombreSaisi, texteDepuisNombre } from "@/components/devis/formatLigne";
import { estPrixCompyo } from "@/lib/devis/qualite";
import {
  AIDE,
  BOUTON_ALERTE,
  BOUTON_PLEIN_LARGE,
  BOUTON_TEXTE,
  CHAMP,
  CREUX,
  FOCUS,
  LIBELLE,
  MONTANT,
  euros,
} from "@/components/ui/recettes";

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

// Design v3 (24/10) : les recettes (champ à contour fin, libellé, bouton
// plein en bas, retrait en bouton d'alerte jamais plein) ; les − / + sont
// des boutons en creux de 56 px. 25/10 : rayon 20 (grand bouton), hauteur
// minimale plutôt que fixe (le texte agrandi ne déborde plus).
const BOUTON_PAS = `grid min-h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-paper-warm text-2xl font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/[0.08] motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;

// Le champ chiffré : contour lisible (jeton `contour`), l'unité à droite,
// chiffres à chasse fixe.
const CHAMP_CHIFFRE =
  "flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-surface px-4 ring-1 ring-inset ring-contour focus-within:ring-2 focus-within:ring-ink";

export function FeuilleLigne({
  ligne,
  tarifs,
  surFermer,
  surDescription,
  surQuantite,
  surPrix,
  surRetirer,
}: {
  ligne: LigneEditee | null;
  tarifs?: TarifsEditeur | null;
  surFermer: () => void;
  /** 13/10 — le texte de la ligne se corrige ici aussi : une ligne de
   *  devis express arrivait vide, et la validation demandait une
   *  description qu'on ne pouvait écrire nulle part sur téléphone. */
  surDescription: (cle: string, valeur: string) => void;
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
          surDescription={surDescription}
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
  surDescription,
  surQuantite,
  surPrix,
  surRetirer,
}: {
  ligne: LigneEditee;
  tarifs?: TarifsEditeur | null;
  surFermer: () => void;
  surDescription: (cle: string, valeur: string) => void;
  surQuantite: (cle: string, valeur: number) => void;
  surPrix: (cle: string, valeur: number) => void;
  surRetirer: (cle: string) => void;
}) {
  const idDescription = useId();
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
        <p className="text-base text-steel [text-wrap:pretty]">Calculée pour atteindre votre minimum d&apos;heures.</p>
      ) : (
        <>
          <div className="mb-5">
            <label htmlFor={idDescription} className={LIBELLE}>
              Ce qui est fait
            </label>
            <textarea
              id={idDescription}
              value={ligne.description}
              onChange={(e) => surDescription(ligne.cle, e.target.value)}
              autoFocus={!ligne.description.trim()}
              rows={2}
              placeholder="Ex : Remplacement du siphon"
              className={`${CHAMP} resize-none py-3 leading-snug`}
            />
          </div>
          <div>
            <label htmlFor={idQuantite} className={LIBELLE}>
              Quantité
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => bougerQuantite(-1)}
                aria-label="Une unité de moins"
                disabled={ligne.quantite <= 0}
                className={BOUTON_PAS}
              >
                −
              </button>
              <div className={CHAMP_CHIFFRE}>
                <input
                  id={idQuantite}
                  value={texteQuantite}
                  onChange={(e) => taperQuantite(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => setTexteQuantite(texteDepuisNombre(ligne.quantite))}
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-xl font-semibold tabular-nums text-ink outline-none"
                />
                <span className="shrink-0 text-[15px] text-steel">{ligne.unite}</span>
              </div>
              <button type="button" onClick={() => bougerQuantite(1)} aria-label="Une unité de plus" className={BOUTON_PAS}>
                +
              </button>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor={idPrix} className={LIBELLE}>
              {libellePrix(ligne.unite)}
            </label>
            <div className={`${CHAMP_CHIFFRE} w-full flex-none`}>
              <input
                id={idPrix}
                value={textePrix}
                onChange={(e) => taperPrix(e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={() => setTextePrix(texteDepuisNombre(ligne.prix_unitaire))}
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-xl font-semibold tabular-nums text-ink outline-none"
              />
              <span className="shrink-0 text-[15px] text-steel">€</span>
            </div>
            {/* Refonte (03/10, duel F lot 4) — ce prix n'est pas le vôtre : il
                disparaît dès que vous en tapez un. */}
            {estPrixCompyo(ligne) && <p className={AIDE}>Prix de référence Compyo, à ajuster.</p>}
          </div>
        </>
      )}

      <div className="mt-5 flex min-h-12 items-baseline justify-between gap-3 border-t border-gris-clair pt-4">
        <span className="text-[15px] text-steel">Cette ligne</span>
        <span className={`whitespace-nowrap text-[28px] leading-tight tracking-[-0.02em] ${MONTANT} font-bold`}>
          {euros(ligne.total, true)}
        </span>
      </div>

      {/* Design v3 (24/10) — le retrait d'abord (en creux d'alerte, avec sa
          question), « Enregistrer » tout en bas, sous le pouce. */}
      <div className="mt-4 flex flex-col gap-3">
        {question ? (
          <div className={`${CREUX} p-4`}>
            <p className="text-base font-semibold text-ink">Retirer cette ligne ?</p>
            <div className="mt-3 flex flex-col gap-2">
              <button type="button" onClick={() => surRetirer(ligne.cle)} className={`${BOUTON_ALERTE} w-full`}>
                Oui, la retirer
              </button>
              <button type="button" onClick={() => setQuestion(false)} className={`${BOUTON_TEXTE} w-full justify-center`}>
                Non, la garder
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setQuestion(true)} className={`${BOUTON_ALERTE} w-full`}>
            Retirer cette ligne
          </button>
        )}

        <button type="button" onClick={surFermer} className={BOUTON_PLEIN_LARGE}>
          Enregistrer
        </button>
      </div>
    </div>
  );
}
