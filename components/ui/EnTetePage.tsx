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
  icone,
  actions,
  children,
  className = "",
}: {
  titre: string;
  sousTitre?: ReactNode;
  /** Une <Pastille> pleine. */
  icone?: ReactNode;
  /** Les boutons de la page (CLASSE_BOUTON_NUIT…). */
  actions?: ReactNode;
  /** Sous le titre, dans la carte : recherche, filtres, semaine… */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`relative overflow-hidden rounded-3xl bg-nuit px-5 py-5 text-white sm:px-7 sm:py-6 ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--c-signal)/0.32),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgb(var(--c-bleu)/0.18),transparent_55%)]"
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            {icone}
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{titre}</h1>
              {sousTitre && <p className="mt-0.5 text-sm text-white/70">{sousTitre}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </header>
  );
}

/** Le bouton principal posé sur la nuit : blanc, texte bleu nuit. */
export const CLASSE_BOUTON_NUIT =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 text-base font-semibold text-nuit active:bg-white/80 sm:hover:bg-white/90 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-nuit";

/** Les autres boutons sur la nuit : verre clair, texte blanc. */
export const CLASSE_BOUTON_NUIT_SECONDAIRE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-base font-semibold text-white ring-1 ring-white/20 active:bg-white/20 sm:hover:bg-white/15 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

/** Un champ (recherche) sur la nuit. */
export const CLASSE_CHAMP_NUIT =
  "w-full min-h-12 rounded-2xl bg-white/10 px-4 text-[15px] text-white placeholder:text-white/55 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-white/60";

/** Les filtres en pastilles sur la nuit : l'actif en blanc plein. */
export const classePuceNuit = (actif: boolean) =>
  `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
    actif ? "bg-white text-nuit" : "bg-white/10 text-white/80 ring-1 ring-white/15 sm:hover:bg-white/15"
  }`;
