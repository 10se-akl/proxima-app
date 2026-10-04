import Link from "next/link";
import type { ReactNode } from "react";
import { Pastille, type CouleurPastille } from "@/components/ui/Pastille";
import { IconeCalendrier, IconeChevron, IconeCloche, IconeDocument, IconeEuro } from "@/components/projet/icones";

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
  const tuiles: Tuile[] = [
    {
      href: "/dashboard/planning",
      nombre: compteurs.rdv,
      libelle: "Rendez-vous aujourd'hui",
      couleur: "bleu",
      icone: <IconeCalendrier className="h-6 w-6" />,
    },
    {
      href: "/dashboard/devis",
      nombre: compteurs.devis,
      libelle: "Devis sans réponse",
      couleur: "vert",
      icone: <IconeDocument className="h-6 w-6" />,
    },
    {
      href: "/dashboard/argent",
      nombre: compteurs.factures,
      libelle: compteurs.factures > 1 ? "Factures à encaisser" : "Facture à encaisser",
      detail: compteurs.facturesEnRetard > 0 ? `dont ${compteurs.facturesEnRetard} en retard` : undefined,
      couleur: "violet",
      icone: <IconeEuro className="h-6 w-6" />,
    },
    {
      href: "#a-regler",
      nombre: compteurs.aRegler,
      libelle: "À régler",
      couleur: "orange",
      icone: <IconeCloche className="h-6 w-6" />,
      signal: compteurs.aRegler > 0,
    },
  ];

  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {tuiles.map((t) => {
        const contenu = (
          <>
            {/* Sur téléphone, la pastille et le nombre sur une ligne, le
                libellé dessous sur toute la largeur ; à partir de la
                tablette, le nombre passe à côté de la pastille. */}
            <span className="flex items-center gap-3 sm:contents">
              <Pastille couleur={t.couleur} taille="tuile">
                {t.icone}
              </Pastille>
              <span className="font-display text-2xl font-bold leading-none tabular-nums text-ink sm:hidden">{t.nombre}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="hidden font-display text-3xl font-bold leading-none tabular-nums text-ink sm:block">{t.nombre}</span>
              <span className="block text-sm leading-tight text-steel sm:mt-1">{t.libelle}</span>
              {t.detail && <span className="block text-xs font-semibold text-signal-fonce dark:text-signal-clair">{t.detail}</span>}
            </span>
            <IconeChevron className="hidden h-4 w-4 shrink-0 text-ink/30 lg:block" />
            {t.signal && <span aria-hidden className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-surface" />}
          </>
        );
        return (
          <li key={t.libelle} className="min-w-0">
            {/* Une ancre de la page même : un simple lien, sans routeur. */}
            {t.href.startsWith("#") ? (
              <a href={t.href} className={CLASSE_TUILE}>
                {contenu}
              </a>
            ) : (
              <Link href={t.href} className={CLASSE_TUILE}>
                {contenu}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
