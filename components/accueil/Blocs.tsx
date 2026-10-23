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

/** Le titre d'un bloc et son nombre (Atelier, 22/10 : sans pastille ni
 *  icône, le titre seul ; `icone` reste accepté pour ne rien casser). */
export function TitreBloc({ titre, nombre }: { titre: string; nombre: number; icone?: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-2 px-1 font-display text-xl font-bold tracking-[-0.02em] text-ink">
      {titre}
      <span className="font-sans text-sm font-normal tabular-nums tracking-normal text-steel">{nombre}</span>
    </h2>
  );
}

/** Refonte visuelle (04/10, maquette d'Axel) : chaque bloc est une carte
 *  qui porte son titre et ses lignes, au lieu de lignes posées sur le
 *  fond. Accueil et Argent la partagent. */
export const CLASSE_CARTE_BLOC = "mt-8";

/** Atelier (22/10) : les lignes d'un bloc, groupées sur une surface
 *  blanche à l'ombre très douce, séparées d'un filet fin — plus de cadre
 *  autour de chaque ligne. */
export const CLASSE_GROUPE = "mt-2.5 overflow-hidden rounded-[20px] bg-surface ombre-douce divide-y divide-ink/[0.08]";

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
      <div className={CLASSE_GROUPE}>{children}</div>
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
    <div className="flex min-h-16 items-stretch">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
      >
        {repere && (
          <span
            className={`w-14 shrink-0 font-display text-base font-bold tabular-nums ${
              repereAccent ? "text-signal-fonce dark:text-signal-clair" : "text-ink"
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
            // 23/10 — sur deux lignes plutôt que coupé (« Sans réponse · 3 se… ») :
            // à côté de deux boutons, la place manque sur téléphone.
            secondaire && <span className="line-clamp-2 block text-sm text-steel">{secondaire}</span>
          )}
        </span>
      </Link>
      {fin}
    </div>
  );
}

/** La colonne de fin d'une ligne, quand l'action est un mot. */
export const CLASSE_FIN_TEXTE =
  "flex shrink-0 items-center border-l border-ink/[0.08] px-4 text-base font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink";

/** 23/10 — la colonne de fin quand le geste est une page : « Facturer »,
 *  « Planifier », « Relire »… (panel : « la ligne la plus rentable n'a
 *  aucun bouton »). */
export function FinLien({ href, libelle }: { href: string; libelle: string }) {
  return (
    <Link href={href} className={CLASSE_FIN_TEXTE}>
      {libelle}
    </Link>
  );
}

/** La colonne de fin « Relancer » : le message prêt s'ouvre sur la fiche. */
export function FinRelancer({ href }: { href: string }) {
  return (
    <Link href={href} className={CLASSE_FIN_TEXTE}>
      Relancer
    </Link>
  );
}
