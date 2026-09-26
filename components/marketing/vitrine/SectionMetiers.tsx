import Link from "next/link";
import { Metiers } from "./metiers/Metiers";

// ============================================================
// La section des métiers (24/09) : un titre court, puis les cartes.
// ============================================================

export function SectionMetiers() {
  return (
    <section id="metiers" aria-labelledby="titre-metiers" className="scroll-mt-16 overflow-hidden px-5 py-24 max-md:pb-20 max-md:pt-14 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <div data-revele className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 max-md:gap-y-3">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-steel">17 métiers du bâtiment</p>
            <h2
              id="titre-metiers"
              className="mt-6 text-balance font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.035em] text-ink max-md:mt-3 max-md:text-[2.3rem] sm:text-7xl"
            >
              Pensé pour votre métier.
            </h2>
          </div>
          <p className="max-w-sm text-[16px] leading-relaxed text-ink/60 max-md:text-[15.5px] max-md:leading-snug">
            Touchez le vôtre. Ses questions, son devis, ses habitudes.
          </p>
        </div>
        <div data-revele className="mt-12 max-md:mt-7 sm:mt-16">
          <Metiers />
        </div>
        {/* 25/09 — Un vrai lien vers la page pilier : les cartes sont des
            boutons, et sans lui aucune page métier n'était reliée à
            l'accueil. */}
        <p className="mt-10 text-center max-md:mt-5">
          <Link
            href="/metiers"
            className="inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-ink underline decoration-ink/25 underline-offset-4 transition hover:decoration-signal"
          >
            Les 17 métiers, page par page <span aria-hidden>→</span>
          </Link>
        </p>
        <p className="mt-4 text-center text-[14px] text-ink/55">
          Votre métier n&apos;y est pas&nbsp;?{" "}
          <Link href="/contact" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-signal">
            Dites-le-nous
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
