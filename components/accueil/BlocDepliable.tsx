"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CLASSE_BOUTON_TEXTE, LIGNES_MAX, TitreBloc } from "./Blocs";

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
}: {
  titre: string;
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
    <section className="mt-7" aria-label={titre}>
      <TitreBloc titre={titre} nombre={lignes.length} />
      <div className="mt-2.5 flex flex-col gap-2">{visibles}</div>
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
