import Link from "next/link";
import type { ReactNode } from "react";

// ============================================================
// Les briques de l'accueil (26/09 — « moins mais mieux », lot B).
//
// Un bloc = un titre de deux ou trois mots et un nombre. Pas de
// sous-titre qui explique : si le titre ne suffit pas, c'est le bloc qui
// est mal pensé. Au-delà de cinq lignes, les cinq premières et un lien.
//
// Refonte (03/10) — mêmes briques pour la page Argent, et les règles 1, 3,
// 4, 7 et 15 de docs/langage-interface.md : la ligne fait 64 px, son
// détail est en `steel` (plus d'opacité sur du texte), et l'appui se voit
// sous le doigt (la couleur fonce), pas seulement au survol de la souris.
// ============================================================

export const LIGNES_MAX = 5;

/** Le titre d'un bloc et son nombre. */
export function TitreBloc({ titre, nombre, icone }: { titre: string; nombre: number; icone?: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 px-1 font-display text-lg font-semibold text-ink">
      {icone}
      {titre}
      <span className="rounded-full bg-ink/[0.07] px-2 py-0.5 font-sans text-xs font-semibold tabular-nums text-steel">{nombre}</span>
    </h2>
  );
}

/** Refonte visuelle (04/10, maquette d'Axel) : chaque bloc est une carte
 *  qui porte son titre et ses lignes, au lieu de lignes posées sur le
 *  fond. Accueil et Argent la partagent. */
export const CLASSE_CARTE_BLOC = "mt-6 rounded-3xl bg-surface p-3 ring-1 ring-ink/10 sm:p-4";

/** « Voir les N », « Tous les devis »… : un bouton texte (règle 6). */
export const CLASSE_BOUTON_TEXTE =
  "inline-flex min-h-12 items-center px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

export function BlocAccueil({
  titre,
  nombre,
  lienTous,
  icone,
  children,
}: {
  titre: string;
  nombre: number;
  icone?: ReactNode;
  /** Au-delà de cinq lignes : où voir le reste. */
  lienTous?: string;
  children: ReactNode;
}) {
  return (
    <section className={CLASSE_CARTE_BLOC} aria-label={titre}>
      <TitreBloc titre={titre} nombre={nombre} icone={icone} />
      <div className="mt-2.5 flex flex-col gap-2">{children}</div>
      {lienTous && nombre > LIGNES_MAX && (
        <Link href={lienTous} className={`-ml-3 mt-1 ${CLASSE_BOUTON_TEXTE}`}>
          Voir les {nombre}
        </Link>
      )}
    </section>
  );
}

/** Une ligne : un repère à gauche (heure, durée), qui, quoi. Toute la
 *  ligne ouvre l'élément. */
export function LigneAccueil({
  href,
  repere,
  repereAccent = false,
  principal,
  secondaire,
  alerte,
  fin,
}: {
  href: string;
  repere?: string;
  repereAccent?: boolean;
  principal: string;
  secondaire?: string;
  /** « Pas enregistré » : remplace le détail, en texte d'alerte (règle 13). */
  alerte?: string;
  /** Un bouton à droite (Relancer, coche…), hors du lien. */
  fin?: ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-stretch overflow-hidden rounded-2xl bg-paper/70 ring-1 ring-ink/10">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
      >
        {repere && (
          <span
            className={`w-14 shrink-0 font-mono text-sm tabular-nums ${
              repereAccent ? "font-semibold text-signal-fonce dark:text-signal-clair" : "text-steel"
            }`}
          >
            {repere}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-ink">{principal}</span>
          {alerte ? (
            <span className="block truncate text-sm font-semibold text-signal-fonce dark:text-signal-clair">{alerte}</span>
          ) : (
            secondaire && <span className="block truncate text-sm text-steel">{secondaire}</span>
          )}
        </span>
      </Link>
      {fin}
    </div>
  );
}

/** La colonne de fin d'une ligne, quand l'action est un mot. */
export const CLASSE_FIN_TEXTE =
  "flex shrink-0 items-center border-l border-ink/15 px-3 text-base font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink";

/** La colonne de fin « Relancer » : le message prêt s'ouvre sur la fiche. */
export function FinRelancer({ href }: { href: string }) {
  return (
    <Link href={href} className={CLASSE_FIN_TEXTE}>
      Relancer
    </Link>
  );
}
