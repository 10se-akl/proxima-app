import type { CSSProperties, ReactNode } from "react";
import {
  IconeCalendrier,
  IconeCoche,
  IconeCrayon,
  IconeDocument,
  IconeEuro,
  IconeMessage,
  IconeMicro,
} from "@/components/projet/icones";

// ============================================================
// Le fil d'un chantier (06/10 — « le compagnon des artisans »).
//
// Juste après le hero, la promesse en une image : une information dite
// une fois suit tout le chantier. Huit étapes sur un même fil, de gauche à
// droite sur ordinateur, de haut en bas sur téléphone. Sous chaque étape,
// ce que Compyo garde de la précédente (une étiquette) : on voit le
// dossier de Mme Garnier se remplir sans que rien soit ressaisi.
//
// Aucune technologie nommée : un résultat par étape. Le même chantier que
// la journée plus bas (Mme Garnier, fuite sous l'évier), pour que les deux
// sections racontent la même histoire.
//
// Rien de nouveau à charger : HTML et CSS, l'apparition au défilement est
// celle de toute la vitrine ([data-revele], Rythme.tsx), décalée étape par
// étape. Sans JavaScript ou avec « réduire les animations », tout est là.
// ============================================================

function IconeDossier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 7.5V18a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-7L10 5H5a1.5 1.5 0 0 0-1.5 1.5v1Z" />
    </svg>
  );
}

function IconeChantier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20h16M6 20V10l6-5 6 5v10M10 20v-5h4v5" />
    </svg>
  );
}

type Etape = { nom: string; texte: string; garde: string; icone: ReactNode };

const ETAPES: Etape[] = [
  { nom: "Message", texte: "Mme Garnier écrit sur WhatsApp.", garde: "Mme Garnier, son numéro", icone: <IconeMessage className="h-5 w-5" /> },
  { nom: "Projet", texte: "Le projet se crée tout seul.", garde: "Fuite sous l'évier", icone: <IconeDossier className="h-5 w-5" /> },
  { nom: "Visite", texte: "Vous dictez, vous photographiez.", garde: "+ 1 note · 3 photos", icone: <IconeMicro className="h-5 w-5" /> },
  { nom: "Devis", texte: "Prêt avec vos prix. Vous relisez.", garde: "+ devis 486 €", icone: <IconeDocument className="h-5 w-5" /> },
  { nom: "Signature", texte: "Elle signe sur son téléphone.", garde: "Signé à 15:10", icone: <IconeCrayon className="h-5 w-5" /> },
  { nom: "Planning", texte: "Le chantier se cale. Elle est prévenue.", garde: "Mercredi matin", icone: <IconeCalendrier className="h-5 w-5" /> },
  { nom: "Chantier", texte: "Tout est sous la main, sur place.", garde: "Code du portail", icone: <IconeChantier className="h-5 w-5" /> },
  { nom: "Facture", texte: "Elle part du devis signé.", garde: "Facture du solde", icone: <IconeEuro className="h-5 w-5" /> },
];

export function SectionFil() {
  return (
    <section id="fil" aria-labelledby="titre-fil" className="scroll-mt-16 px-5 pb-10 pt-20 max-md:pt-14 sm:px-8 sm:pb-16 sm:pt-32">
      <div className="mx-auto max-w-7xl">
        <header data-revele className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-steel">Le fil d&apos;un chantier</p>
          <h2
            id="titre-fil"
            className="mt-6 text-balance font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.035em] text-ink max-md:mt-3 max-md:text-[2.3rem] sm:text-7xl"
          >
            Vous le dites une fois.
          </h2>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink/60 max-md:mt-3 max-md:text-[15.5px] max-md:leading-snug sm:text-lg">
            Compyo le garde, du premier message du client jusqu&apos;à la facture.
          </p>
        </header>

        <ol className="v-fil relative mt-12 max-md:mt-9 lg:mt-20 lg:grid lg:grid-cols-8 lg:gap-x-4">
          {ETAPES.map((e, i) => (
            <li
              key={e.nom}
              data-revele
              style={{ "--d": `${Math.min(i, 7) * 0.07}s` } as CSSProperties}
              className="v-fil-etape relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 pb-7 last:pb-0 lg:block lg:pb-0"
            >
              <span className="v-fil-noeud relative z-[1] grid h-10 w-10 place-items-center rounded-full bg-paper text-ink ring-1 ring-ink/15 shadow-[var(--v-ombre-legere)]">
                {e.icone}
              </span>
              <div className="min-w-0 pt-1.5 lg:pt-5">
                <p className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
                  <span className="mr-2 font-mono text-[11px] font-normal tracking-wide text-steel">{String(i + 1).padStart(2, "0")}</span>
                  {e.nom}
                </p>
                <p className="mt-1 text-[15px] leading-snug text-ink/65">{e.texte}</p>
                <p className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-signal/10 px-2.5 py-1 text-[12.5px] font-medium text-signal-fonce dark:text-signal-clair">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  <span className="truncate">{e.garde}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p data-revele className="mt-10 flex items-center gap-3 text-[17px] font-medium text-ink max-md:mt-8 lg:mt-14">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-succes/15 text-succes">
            <IconeCoche className="h-4 w-4" />
          </span>
          Rien ne s&apos;est perdu. Rien n&apos;a été ressaisi.
        </p>
      </div>
    </section>
  );
}
