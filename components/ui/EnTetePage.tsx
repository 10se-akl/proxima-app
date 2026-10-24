import type { ReactNode } from "react";

// ============================================================
// L'en-tête des pages (refonte visuelle 04/10, maquette d'Axel).
//
// La même carte bleu nuit que l'accueil, en plus compacte : une pastille,
// le titre, une phrase, les boutons de la page à droite, et dessous ce
// qui se règle avant de lire la liste (une recherche, une semaine).
// Bleu nuit dans les deux modes : on sait toujours où commence la page.
// ============================================================

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
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-4xl">{titre}</h1>
          {sousTitre && <p className="mt-1 text-base text-steel">{sousTitre}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}

/** Le bouton principal de l'en-tête : plein, à l'encre (un seul par écran). */
export const CLASSE_BOUTON_NUIT =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:scale-[0.97] sm:hover:bg-ink/90 motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/** Les autres boutons de l'en-tête : en creux. */
export const CLASSE_BOUTON_NUIT_SECONDAIRE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-paper-warm px-4 text-base font-semibold text-ink active:scale-[0.97] sm:hover:bg-ink/[0.08] motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

/** Un champ (recherche) : une surface blanche à l'ombre douce. */
export const CLASSE_CHAMP_NUIT =
  "w-full min-h-12 rounded-2xl bg-surface px-4 text-base text-ink placeholder:text-steel ombre-douce focus:outline-none focus:ring-2 focus:ring-ink";

/** Les filtres en pastilles : l'actif à l'encre, les autres en creux. */
export const classePuceNuit = (actif: boolean) =>
  `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
    actif ? "bg-ink text-paper" : "bg-paper-warm text-ink sm:hover:bg-ink/[0.08]"
  }`;
