import Link from "next/link";
import type { ReactNode } from "react";
import type { CouleurPastille } from "@/components/ui/Pastille";
import { IconeChevron } from "@/components/projet/icones";

// ============================================================
// Les quatre compteurs de l'accueil (refonte visuelle 04/10, maquette
// d'Axel). Chacun est un lien vers la liste qu'il compte ; un zéro est
// une information (« rien à régler »), il reste affiché.
// ============================================================

export type CompteursAccueil = {
  rdv: number;
  devis: number;
  factures: number;
  facturesEnRetard: number;
  aRegler: number;
};

type Tuile = {
  href: string;
  nombre: number;
  libelle: string;
  detail?: string;
  couleur: CouleurPastille;
  icone: ReactNode;
  /** Un point terracotta : quelque chose attend un geste. */
  signal?: boolean;
};

const CLASSE_TUILE =
  "relative flex h-full min-h-[5.25rem] flex-col gap-2 rounded-2xl bg-surface p-3.5 ring-1 ring-ink/10 active:bg-ink/5 sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:hover:ring-ink/25 motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

export function TuilesAccueil({ compteurs }: { compteurs: CompteursAccueil }) {
  // Atelier (22/10) : plus quatre tuiles aux pastilles de quatre couleurs
  // qui se disputaient l'œil (et affichaient « 0 » à un compte neuf), mais
  // une courte liste « En cours » : seulement ce qui n'est pas à zéro,
  // chaque ligne mène à sa liste. « À régler » a déjà son bloc.
  const lignes = [
    { href: "/dashboard/devis", libelle: "Devis sans réponse", nombre: compteurs.devis, detail: undefined as string | undefined },
    {
      href: "/dashboard/argent",
      libelle: compteurs.factures > 1 ? "Factures à encaisser" : "Facture à encaisser",
      nombre: compteurs.factures,
      detail: compteurs.facturesEnRetard > 0 ? `dont ${compteurs.facturesEnRetard} en retard` : undefined,
    },
    { href: "/dashboard/planning", libelle: "Rendez-vous aujourd'hui", nombre: compteurs.rdv, detail: undefined },
  ].filter((l) => l.nombre > 0);
  if (lignes.length === 0) return null;

  return (
    <section aria-label="En cours" className="mt-8">
      <h2 className="px-1 font-display text-xl font-bold tracking-[-0.02em] text-ink">En cours</h2>
      <ul className="mt-2.5 overflow-hidden rounded-[20px] bg-surface ombre-douce divide-y divide-ink/[0.08]">
        {lignes.map((l) => (
          <li key={l.libelle}>
            <Link
              href={l.href}
              className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-ink/[0.05] sm:hover:bg-ink/[0.03] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base text-ink">{l.libelle}</span>
                {l.detail && <span className="block text-sm font-semibold text-signal-fonce">{l.detail}</span>}
              </span>
              <span className="font-display text-xl font-bold tabular-nums text-ink">{l.nombre}</span>
              <IconeChevron className="h-4 w-4 shrink-0 text-steel" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
