import type { CSSProperties, ReactNode } from "react";

// ============================================================
// Un chapitre de la journée : l'heure, une phrase, puis la scène.
//
// La toile de chaque scène a sa propre lumière : le soleil (un halo)
// part d'en haut à gauche le matin et finit bas à droite en fin de
// journée. On ne le remarque pas en le cherchant ; on sent que la journée
// avance.
// ============================================================

export function Chapitre({
  index,
  heure,
  titre,
  texte,
  soleil,
  children,
}: {
  index: number;
  heure: string;
  titre: string;
  texte: string;
  /** Position du soleil sur la toile : [x, y, intensité]. */
  soleil: [string, string, number];
  children: ReactNode;
}) {
  return (
    <article
      id={`chapitre-${index + 1}`}
      data-chapitre={index}
      aria-labelledby={`titre-chapitre-${index + 1}`}
      className="scroll-mt-32 pb-24 pt-8 sm:pb-32 xl:pt-0 [&:last-child]:pb-8"
    >
      <p className="font-mono text-[12px] tracking-[0.2em] text-signal">
        <time>{heure}</time>
      </p>
      <h3
        id={`titre-chapitre-${index + 1}`}
        className="mt-3 text-balance font-display text-[2rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-5xl"
      >
        {titre}
      </h3>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink/60 sm:text-[17px]">{texte}</p>

      <div
        data-scene
        className="v-toile relative mt-9 rounded-[1.6rem] sm:mt-12 sm:rounded-[2.2rem]"
        style={
          {
            "--soleil-x": soleil[0],
            "--soleil-y": soleil[1],
            "--soleil-force": String(soleil[2]),
          } as CSSProperties
        }
      >
        <div aria-hidden className="v-grain pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" />
        {children}
        <button
          type="button"
          data-rejouer
          aria-label={`Rejouer la scène : ${titre}`}
          className="v-rejouer absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1.5 text-[12px] font-medium text-ink/70 ring-1 ring-ink/10 backdrop-blur transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 sm:bottom-5 sm:right-5"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
            <path d="M13 8a5 5 0 1 1-1.5-3.55M13 2.5V5h-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Rejouer
        </button>
      </div>
    </article>
  );
}
