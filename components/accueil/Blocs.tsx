import Link from "next/link";
import type { ReactNode } from "react";

// ============================================================
// Les briques de l'accueil (26/09 — « moins mais mieux », lot B).
//
// Un bloc = un titre de deux ou trois mots et un nombre. Pas de
// sous-titre qui explique : si le titre ne suffit pas, c'est le bloc qui
// est mal pensé. Au-delà de cinq lignes, les cinq premières et un lien.
// ============================================================

export const LIGNES_MAX = 5;

export function BlocAccueil({
  titre,
  nombre,
  lienTous,
  children,
}: {
  titre: string;
  nombre: number;
  /** Au-delà de cinq lignes : où voir le reste. */
  lienTous?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7" aria-label={titre}>
      <h2 className="flex items-baseline gap-2 font-display text-[17px] font-semibold text-ink">
        {titre}
        <span className="font-sans text-[13px] font-normal tabular-nums text-steel">{nombre}</span>
      </h2>
      <div className="mt-2.5 flex flex-col gap-2">{children}</div>
      {lienTous && nombre > LIGNES_MAX && (
        <Link href={lienTous} className="mt-2 inline-flex min-h-12 items-center text-[14px] font-medium text-ink/60 hover:text-ink">
          Voir les {nombre} →
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
  fin,
}: {
  href: string;
  repere?: string;
  repereAccent?: boolean;
  principal: string;
  secondaire?: string;
  /** Un bouton à droite (Relancer…), hors du lien. */
  fin?: ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-stretch overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/[0.07]">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink/[0.03]">
        {repere && (
          <span
            className={`w-14 shrink-0 font-mono text-[13px] tabular-nums ${
              repereAccent ? "font-semibold text-signal-fonce dark:text-signal-clair" : "text-ink/65"
            }`}
          >
            {repere}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink">{principal}</span>
          {secondaire && <span className="block truncate text-[13px] text-ink/65">{secondaire}</span>}
        </span>
      </Link>
      {fin}
    </div>
  );
}
