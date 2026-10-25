import Link from "next/link";
import type { ReactNode } from "react";
import { BOUTON_TEXTE, COMPTEUR, TITRE_SECTION } from "@/components/ui/recettes";

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
    // 25/10 — les recettes communes : le même titre et le même compteur
    // que « À faire » (le compteur était en 14 px ici, en 15 ailleurs).
    <h2 className={`flex items-baseline gap-2 ${TITRE_SECTION}`}>
      {titre}
      <span className={COMPTEUR}>{nombre}</span>
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

/** « Voir les N », « Tous les devis »… : un bouton texte (règle 6).
 *  25/10 — la recette commune : encre, sans soulignement (on ne souligne
 *  que dans un texte courant). */
export const CLASSE_BOUTON_TEXTE = BOUTON_TEXTE;

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
  repereEtroit = false,
  principal,
  secondaire,
  alerte,
  fin,
}: {
  href: string;
  repere?: string;
  repereAccent?: boolean;
  /** 25/10 — des repères courts (« 6 j », « hier ») : colonne de 48 px au
   *  lieu de 56 (« 14 h 30 » demande les 56). */
  repereEtroit?: boolean;
  principal: string;
  secondaire?: string;
  /** « Pas enregistré » : remplace le détail, en texte d'alerte (règle 13). */
  alerte?: string;
  /** Un bouton à droite (Relancer, coche…), hors du lien. */
  fin?: ReactNode;
}) {
  return (
    // Design v3 : les gestes de fin sont des pastilles posées dans la ligne
    // (plus de colonnes séparées par des filets : « ça fait tableur »).
    <div className="flex min-h-[4.25rem] items-center">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
      >
        {repere && (
          <span
            className={`${repereEtroit ? "min-w-12" : "min-w-[3.5rem]"} shrink-0 whitespace-nowrap font-display text-base font-bold tabular-nums ${
              repereAccent ? "text-signal-fonce dark:text-signal-clair" : "text-ink"
            }`}
          >
            {repere}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block break-words text-[17px] font-semibold leading-snug text-ink">{principal}</span>
          {alerte ? (
            <span className="line-clamp-2 block break-words text-sm font-semibold text-signal-fonce dark:text-signal-clair">{alerte}</span>
          ) : (
            // 23/10 — sur deux lignes plutôt que coupé (« Sans réponse · 3 se… ») :
            // à côté de deux boutons, la place manque sur téléphone.
            // 25/10 — la fin courte (« · 3 sem. ») ne se coupe jamais : elle passe
            // à la ligne d'un bloc, avec son point médian.
            secondaire && (
              <span className="line-clamp-2 block text-sm text-steel">
                {typeof secondaire === "string" ? sansCoupureFinale(secondaire) : secondaire}
              </span>
            )
          )}
        </span>
      </Link>
      {fin && <span className="flex shrink-0 items-center gap-1.5 py-2 pr-3">{fin}</span>}
    </div>
  );
}

/** La colonne de fin d'une ligne, quand l'action est un mot. */
export const CLASSE_FIN_TEXTE =
  "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-paper-warm px-4 text-[15px] font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/[0.08] motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

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

/** « Sans réponse · 3 sem. » : le dernier morceau après « · », s'il est
 *  court, reste d'un seul tenant avec son point (espaces insécables). */
function sansCoupureFinale(texte: string): string {
  const i = texte.lastIndexOf(" · ");
  if (i < 0) return texte;
  const fin = texte.slice(i + 3);
  if (fin.length > 16) return texte;
  return `${texte.slice(0, i)} · ${fin.replace(/ /g, " ")}`;
}
