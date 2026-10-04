import type { ReactNode } from "react";

// ============================================================
// La pastille d'icône (refonte visuelle 04/10, maquette d'Axel).
//
// Une couleur par sorte de chose, la même partout : bleu pour les
// rendez-vous, vert pour les devis, violet pour les factures, orange pour
// ce qui attend un geste, terracotta pour l'action principale. On repère
// la ligne avant de la lire. La couleur double toujours un mot, jamais
// seule (règle 11 de docs/langage-interface.md).
//   "plein" : disque de couleur, icône blanche (compteurs, actions) ;
//   "doux"  : fond teinté, icône de la couleur (titres de bloc).
// ============================================================

export type CouleurPastille = "bleu" | "vert" | "violet" | "orange" | "signal";

const PLEIN: Record<CouleurPastille, string> = {
  bleu: "bg-bleu text-white",
  vert: "bg-succes text-white",
  violet: "bg-violet text-white",
  orange: "bg-alerte-orange text-white",
  signal: "bg-signal text-white",
};

const DOUX: Record<CouleurPastille, string> = {
  bleu: "bg-bleu/15 text-bleu",
  vert: "bg-succes/15 text-succes",
  violet: "bg-violet/15 text-violet",
  orange: "bg-alerte-orange/15 text-alerte-orange",
  signal: "bg-signal/15 text-signal",
};

const TAILLES = {
  petite: "h-8 w-8 rounded-lg",
  moyenne: "h-11 w-11 rounded-xl",
  grande: "h-12 w-12 rounded-full sm:h-14 sm:w-14",
  tuile: "h-10 w-10 rounded-full sm:h-14 sm:w-14",
} as const;

export function Pastille({
  couleur,
  variante = "plein",
  taille = "moyenne",
  children,
  className = "",
}: {
  couleur: CouleurPastille;
  variante?: "plein" | "doux";
  taille?: keyof typeof TAILLES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center ${TAILLES[taille]} ${variante === "plein" ? PLEIN[couleur] : DOUX[couleur]} ${className}`}
    >
      {children}
    </span>
  );
}

/** L'étiquette d'une étape (« Devis envoyé », « En cours ») : fond teinté,
 *  texte de la même couleur. */
export const CLASSE_ETIQUETTE: Record<CouleurPastille, string> = {
  bleu: "bg-bleu/15 text-bleu",
  vert: "bg-succes/15 text-succes",
  violet: "bg-violet/15 text-violet",
  orange: "bg-alerte-orange/15 text-alerte-orange",
  signal: "bg-signal/15 text-signal-fonce dark:text-signal-clair",
};
