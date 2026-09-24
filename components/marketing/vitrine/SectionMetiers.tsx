import Link from "next/link";
import { Metiers } from "./metiers/Metiers";

// ============================================================
// La section des métiers (24/09) : un titre court, puis les cartes.
// ============================================================

export function SectionMetiers() {
  return (
    <section id="metiers" aria-labelledby="titre-metiers" className="scroll-mt-16 overflow-hidden px-5 py-24 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-steel">17 métiers du bâtiment</p>
            <h2
              id="titre-metiers"
              className="mt-6 text-balance font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.035em] text-ink sm:text-7xl"
            >
              Pensé pour votre métier.
            </h2>
          </div>
          <p className="max-w-sm text-[16px] leading-relaxed text-ink/60">
            Touchez le vôtre. Ses questions, son devis, ses habitudes.
          </p>
        </div>
        <div className="mt-12 sm:mt-16">
          <Metiers />
        </div>
        <p className="mt-10 text-center text-[14px] text-ink/55">
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
