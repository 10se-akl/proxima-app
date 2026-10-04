import type { ReactNode } from "react";

// ============================================================
// L'en-tête de l'accueil (refonte visuelle 04/10, maquette d'Axel).
//
// Une carte bleu nuit, dans les deux modes : la date, « Bonjour Thomas »,
// une phrase, et à droite (en dessous sur téléphone) ce qui compte
// maintenant. Le décor tient en deux halos de couleur : aucune image à
// charger sur un réseau de chantier.
// ============================================================

export function EnTeteAccueil({
  dateDuJour,
  titre,
  sousTitre,
  children,
}: {
  dateDuJour: string;
  titre: string;
  sousTitre: string;
  /** Maintenant, « Tout est réglé. », ou l'invitation au premier projet. */
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-nuit px-5 py-6 text-white sm:px-8 sm:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--c-signal)/0.38),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgb(var(--c-bleu)/0.22),transparent_55%)]"
      />
      <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end lg:gap-8">
        <div className="min-w-0">
          <p className="text-sm text-white/60 first-letter:uppercase">{dateDuJour}</p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">
            {titre} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-base text-white/70">{sousTitre}</p>
        </div>
        {children && <div className="mt-5 min-w-0 lg:mt-0">{children}</div>}
      </div>
    </section>
  );
}
