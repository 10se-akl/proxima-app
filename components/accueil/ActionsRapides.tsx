"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Pastille, type CouleurPastille } from "@/components/ui/Pastille";
import { IconeCalendrier, IconeChevron, IconeCrayon, IconeDocument, IconeEuro, IconeMessage, IconePhoto, IconePlus } from "@/components/projet/icones";

// ============================================================
// Le grand bouton et les raccourcis de l'accueil (refonte visuelle 04/10,
// maquette d'Axel).
//
// La maquette mettait ici « Parler à Compyo », un micro : il avait été
// retiré le 27/09 (« sert à rien et marche pas bien », la dictée du
// navigateur est capricieuse en application installée). Le grand bouton
// terracotta ouvre donc la même capture que le [+] : un message, une
// photo, ou à la main. Les raccourcis mènent droit aux écrans les plus
// fréquents ; sur téléphone, la barre du bas et son [+] font ce travail.
// ============================================================

type Raccourci = { href: string; libelle: string; couleur: CouleurPastille; icone: ReactNode };

const RACCOURCIS: Raccourci[] = [
  { href: "/dashboard/demandes/importer", libelle: "Coller un message", couleur: "signal", icone: <IconeMessage className="h-5 w-5" /> },
  { href: "/dashboard/devis", libelle: "Devis", couleur: "vert", icone: <IconeDocument className="h-5 w-5" /> },
  { href: "/dashboard/factures", libelle: "Factures", couleur: "violet", icone: <IconeEuro className="h-5 w-5" /> },
  { href: "/dashboard/planning/nouveau", libelle: "Rendez-vous", couleur: "bleu", icone: <IconeCalendrier className="h-5 w-5" /> },
  { href: "/dashboard/notes/nouvelle", libelle: "Une note", couleur: "orange", icone: <IconeCrayon className="h-5 w-5" /> },
  { href: "/dashboard/demandes/importer-capture", libelle: "Photo ou capture", couleur: "signal", icone: <IconePhoto className="h-5 w-5" /> },
];

export function ActionsRapides() {
  return (
    <section aria-label="Actions rapides" className="mt-6 hidden sm:block">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("compyo:ouvrir-capture"))}
        className="flex min-h-[4.75rem] w-full items-center gap-4 rounded-3xl bg-signal px-5 py-4 text-left text-white shadow-[0_18px_36px_-20px_rgb(var(--c-signal)/0.95)] active:brightness-95 sm:hover:brightness-105 motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20">
          <IconePlus className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-semibold">Nouveau projet</span>
          <span className="block text-sm text-white/85">Un message, une photo, ou à la main.</span>
        </span>
        <IconeChevron className="h-5 w-5 shrink-0" />
      </button>

      <ul className="mt-3 grid grid-cols-3 gap-2.5">
        {RACCOURCIS.map((r) => (
          <li key={r.href} className="min-w-0">
            <Link
              href={r.href}
              className="flex min-h-[5.75rem] flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-2 py-3 text-center text-sm font-semibold leading-tight text-ink ring-1 ring-ink/10 active:bg-ink/5 sm:hover:ring-ink/25 motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <Pastille couleur={r.couleur} variante="doux">
                {r.icone}
              </Pastille>
              {r.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
