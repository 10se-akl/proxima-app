"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CLASSE_BOUTON_TEXTE, CLASSE_CARTE_BLOC, CLASSE_GROUPE, LIGNES_MAX, TitreBloc } from "./Blocs";

// ============================================================
// Un bloc de cinq lignes au plus, puis « Voir les N » (refonte 03/10).
//
// Une liste mêlée (des factures et des devis, des dossiers de natures
// différentes) n'a pas de page « tout voir » : « Voir les N » s'ouvre donc
// sur place (duel C, greffe de B). Quand une vraie liste existe (les devis
// à envoyer → la liste des devis filtrée), `lienTous` y mène à la place.
// ============================================================

export function BlocDepliable({
  titre,
  lignes,
  lienTous,
  apres,
  icone,
  sansTitre = false,
}: {
  titre: string;
  /** Design v3 : posé sous le titre commun « À faire » (VueAccueil). */
  sansTitre?: boolean;
  icone?: ReactNode;
  /** Les lignes déjà rendues, chacune avec sa `key`. */
  lignes: ReactNode[];
  lienTous?: string;
  /** Ce qui suit les lignes dans le bloc (une trace, une erreur). */
  apres?: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const visibles = ouvert ? lignes : lignes.slice(0, LIGNES_MAX);
  const reste = lignes.length > LIGNES_MAX && !ouvert;

  return (
    <section className={sansTitre ? "" : CLASSE_CARTE_BLOC} aria-label={titre}>
      {!sansTitre && <TitreBloc titre={titre} nombre={lignes.length} icone={icone} />}
      <div className={CLASSE_GROUPE}>{visibles}</div>
      {apres}
      {reste &&
        (lienTous ? (
          <Link href={lienTous} className={`-ml-3 mt-1 ${CLASSE_BOUTON_TEXTE}`}>
            Voir les {lignes.length}
          </Link>
        ) : (
          <button type="button" onClick={() => setOuvert(true)} aria-expanded={false} className={`-ml-3 mt-1 ${CLASSE_BOUTON_TEXTE}`}>
            Voir les {lignes.length}
          </button>
        ))}
    </section>
  );
}
