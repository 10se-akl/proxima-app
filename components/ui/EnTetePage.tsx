import type { ReactNode } from "react";
import { BOUTON_CREUX, BOUTON_PLEIN, CHAMP, SECONDAIRE, TITRE_ECRAN, puce } from "@/components/ui/recettes";

// ============================================================
// L'en-tête des pages (refonte visuelle 04/10, maquette d'Axel).
//
// Le titre de l'écran, une phrase, les boutons de la page à droite, et
// dessous ce qui se règle avant de lire la liste (une recherche, une
// semaine).
//
// Design v3 (24/10) : le titre et sa phrase viennent des recettes
// (TITRE_ECRAN, SECONDAIRE) ; les anciennes constantes « NUIT » restent
// exportées (d'autres écrans les importent) mais sont réalignées sur les
// recettes. La grille commune des écrans (marges, largeurs) est ici aussi :
// CLASSE_PAGE et ses deux largeurs.
// ============================================================

/** Design v3 (24/10) — la grille d'un écran : 16 px de marge jusqu'à
 *  399 px, 20 px au-delà, 32 px dès 640 px, 40 px dès 1024 px. Centré. */
export const CLASSE_PAGE = "mx-auto w-full px-4 pb-10 pt-6 min-[400px]:px-5 sm:p-8 lg:p-10 lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10";
/** Un écran de lecture ou de réglages (Argent, Paramètres, erreur). */
export const CLASSE_PAGE_ETROITE = `${CLASSE_PAGE} max-w-2xl`;
/** Un écran de liste ou de chiffres (Projets, Devis, Factures, Bilan, Guide). */
export const CLASSE_PAGE_LARGE = `${CLASSE_PAGE} max-w-4xl xl:max-w-5xl`;

export function EnTetePage({
  titre,
  sousTitre,
  actions,
  children,
  className = "",
}: {
  titre: string;
  sousTitre?: ReactNode;
  /** Atelier (22/10) : plus affichée — le titre seul suffit. */
  icone?: ReactNode;
  /** Les boutons de la page (CLASSE_BOUTON_NUIT…). */
  actions?: ReactNode;
  /** Sous le titre : recherche, filtres, semaine… */
  children?: ReactNode;
  className?: string;
}) {
  // Atelier (22/10) : la carte bleu nuit à halos faisait « tableau de
  // bord ». Le titre est posé sur le fond, comme sur l'accueil ; la seule
  // carte sombre de l'application reste « Maintenant ».
  return (
    <header className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className={TITRE_ECRAN}>{titre}</h1>
          {sousTitre && <p className={`mt-1 ${SECONDAIRE} sm:text-base`}>{sousTitre}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}

/** Le bouton principal de l'en-tête : plein, à l'encre (un seul par écran). */
export const CLASSE_BOUTON_NUIT = BOUTON_PLEIN;

/** Les autres boutons de l'en-tête : en creux. */
export const CLASSE_BOUTON_NUIT_SECONDAIRE = BOUTON_CREUX;

/** Un champ (recherche) : la surface blanche à contour fin des champs. */
export const CLASSE_CHAMP_NUIT = CHAMP;

/** Les filtres en pastilles : l'actif à l'encre, les autres en creux. */
export const classePuceNuit = puce;
