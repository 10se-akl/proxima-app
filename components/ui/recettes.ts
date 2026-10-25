// ============================================================
// Design v3 « Compagnon » — les recettes (24/10).
//
// Une décision de style se prend ICI, une fois, jamais dans un écran. Les
// écrans composent avec ces chaînes de classes (Tailwind, jetons de
// app/globals.css). Voir docs/design-v3.md pour le pourquoi.
//
// Règles : un seul bouton plein par écran ; le secondaire est en creux ;
// une carte = surface + ombre douce (pas de contour) ; un champ garde un
// contour (on doit voir où taper) ; texte en `ink` ou `steel`, jamais une
// opacité d'encre ; rien sous 13 px ; cibles ≥ 48 px ; pas de flou, pas de
// dégradé, pas de capitales espacées ; `dark:` seulement en dernier recours
// (les jetons changent déjà avec le thème).
// ============================================================

/** L'anneau de focus clavier, partout. */
export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

// ---- Surfaces --------------------------------------------------------------

/** Une carte (sans marge intérieure). */
export const CARTE = "rounded-[20px] bg-surface ombre-douce";
/** Une carte avec sa marge intérieure standard. */
export const CARTE_PLEINE = "rounded-[20px] bg-surface p-5 ombre-douce";
/** Une liste groupée : des lignes séparées d'un filet, dans une carte. */
export const GROUPE = "overflow-hidden rounded-[20px] bg-surface ombre-douce divide-y divide-gris-clair";
/** Une zone en creux (encart, rappel, état vide discret). */
export const CREUX = "rounded-[20px] bg-paper-warm";

// ---- Boutons ---------------------------------------------------------------

// 25/10 — une seule forme de bouton : la pilule, compacte (48 px) ou large
// (56 px). Les tuiles d'action (Appeler, Photo…), plus hautes, ont le rayon
// 20 des cartes. Avant : 12, 14, 16, 20 et la pilule selon l'écran.
const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold motion-safe:transition-colors motion-safe:duration-150 disabled:cursor-not-allowed disabled:opacity-60";
const COMPACT = `${BASE} min-h-12 rounded-full px-5 text-base`;
const LARGE = `${BASE} min-h-14 w-full rounded-full px-6 text-[17px]`;
const PLEIN = "bg-ink text-paper active:bg-ink/85 sm:hover:bg-ink/90";
const EN_CREUX = "bg-paper-warm text-ink active:bg-ink/10 sm:hover:bg-ink/[0.08]";
const EN_SURFACE = "bg-surface text-ink active:bg-ink/10 sm:hover:bg-ink/[0.06]";

/** L'action principale de l'écran (un seul par écran). En sombre, l'encre
 *  devient claire : le bouton principal est clair, texte sombre, partout. */
export const BOUTON_PLEIN = `${COMPACT} ${PLEIN} ${FOCUS}`;
/** L'action principale en bas d'écran ou de feuille : pleine largeur, 56 px. */
export const BOUTON_PLEIN_LARGE = `${LARGE} ${PLEIN} ${FOCUS}`;
/** Une action secondaire : en creux, sans contour. */
export const BOUTON_CREUX = `${COMPACT} ${EN_CREUX} ${FOCUS}`;
/** Le secondaire pleine largeur. */
export const BOUTON_CREUX_LARGE = `${LARGE} ${EN_CREUX} ${FOCUS}`;
/** Le secondaire posé sur un fond déjà en creux ou teinté (encart,
 *  alerte) : en surface, pour rester visible. */
export const BOUTON_CREUX_SURFACE = `${COMPACT} ${EN_SURFACE} ${FOCUS}`;
/** Une action destructrice ou d'alerte (jamais pleine). */
export const BOUTON_ALERTE = `${COMPACT} bg-signal-fond text-signal-fonce active:brightness-95 ${FOCUS}`;
/** Une action tertiaire en toutes lettres (« Voir les 8 », « Annuler »,
 *  « Voir le PDF ») : de l'encre, sans soulignement — on ne souligne que
 *  dans un texte courant. Un chevron peut suivre (« Voir tous › »). */
const BASE_TEXTE = `inline-flex min-h-12 items-center gap-1 rounded-full px-3 font-semibold active:bg-ink/10 sm:hover:bg-ink/[0.06] motion-safe:transition-colors ${FOCUS}`;
export const BOUTON_TEXTE = `${BASE_TEXTE} text-base text-ink`;
/** La même, plus discrète (15 px, steel) : « Ignorer », « Retirer le lot ». */
export const BOUTON_TEXTE_DISCRET = `${BASE_TEXTE} text-[15px] text-steel`;
const BASE_ICONE = `grid h-12 w-12 shrink-0 place-items-center rounded-full active:bg-ink/10 sm:hover:bg-ink/[0.06] motion-safe:transition-colors ${FOCUS}`;
/** Un bouton icône seul (48 × 48) : toujours un aria-label. */
export const BOUTON_ICONE = `${BASE_ICONE} text-ink`;
/** Le même en steel (fermer, supprimer une ligne, astuce). */
export const BOUTON_ICONE_DISCRET = `${BASE_ICONE} text-steel`;
const BASE_TUILE = "flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-[20px] px-2 text-[15px] font-semibold motion-safe:transition-colors";
/** Une tuile d'action (Appeler, Photo, Dicter…) : icône au-dessus, mot dessous. */
export const TUILE_ACTION = `${BASE_TUILE} ${EN_CREUX} ${FOCUS}`;
/** La même tuile quand elle est l'action principale de l'écran. */
export const TUILE_ACTION_PLEINE = `${BASE_TUILE} ${PLEIN} ${FOCUS}`;

/** Une pastille de filtre (« Tous », « À traiter ») : l'actif à l'encre. */
export const puce = (actif: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[15px] font-semibold motion-safe:transition-colors ${FOCUS} ${
    actif ? "bg-ink text-paper" : "bg-paper-warm text-ink sm:hover:bg-ink/[0.08]"
  }`;

// ---- Champs ----------------------------------------------------------------

// 25/10 (audit) — le contour d'un champ passe de gris-clair (1,3:1, on ne
// voyait pas où taper) au jeton `contour` (3,5:1, WCAG 1.4.11).
const BASE_CHAMP =
  "min-h-12 rounded-[14px] bg-surface text-base text-ink placeholder:text-steel ring-1 ring-inset ring-contour focus:outline-none focus:ring-2 focus:ring-ink disabled:opacity-60";
/** Un champ texte, une zone de texte, une liste déroulante. */
export const CHAMP = `w-full ${BASE_CHAMP} px-4`;
/** Un champ serré (colonnes de chiffres d'un devis) : 12 px de marge. */
export const CHAMP_COMPACT = `w-full ${BASE_CHAMP} px-3 tabular-nums`;
/** Le même, à la largeur de son contenu (liste du lot d'une ligne). */
export const CHAMP_COMPACT_AUTO = `w-auto ${BASE_CHAMP} px-3`;
/** Une liste déroulante : l'apparence maison (chevron en steel), le
 *  comportement natif (clavier, lecteur d'écran, roue du téléphone). */
export const SELECT = `w-full ${BASE_CHAMP} appearance-none bg-no-repeat pl-4 pr-10 [background-position:right_0.875rem_center] [background-size:16px] [background-image:var(--chevron-select)]`;
/** Une case à cocher maison (22 px, coins 6) : contour lisible, encre et
 *  coche claire une fois cochée. Reste un <input type="checkbox"> natif. */
export const CASE =
  "h-[22px] w-[22px] shrink-0 cursor-pointer appearance-none rounded-[6px] bg-surface bg-center bg-no-repeat [background-size:16px] ring-1 ring-inset ring-contour checked:bg-ink checked:ring-ink checked:[background-image:var(--coche)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60";

/** Sur ordinateur, toutes les pages partent du même bord : celui d'un cadre
 *  de 72 rem centré dans la zone de contenu (40 px de marge intérieure). À
 *  ajouter au conteneur racine d'une page, à côté de son max-w. */
export const CADRE_PAGE = "lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10";
/** Le libellé d'un champ (au-dessus). */
export const LIBELLE = "mb-1.5 block text-[15px] font-medium text-ink";
/** L'aide sous un champ. */
export const AIDE = "mt-1.5 block text-sm text-steel";
/** Le message d'erreur sous un champ. */
export const ERREUR = "mt-1.5 block text-sm font-semibold text-signal-fonce";

// ---- Textes ----------------------------------------------------------------

/** Le titre d'un écran (h1). */
export const TITRE_ECRAN = "font-display text-3xl font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-4xl";
/** Le titre d'un bloc ou d'une section (h2), aligné sur les cartes. */
export const TITRE_SECTION = "font-display text-xl font-bold text-ink";
/** Le titre dans une carte ou une feuille. */
export const TITRE_CARTE = "font-display text-lg font-semibold text-ink";
/** Le petit compteur gris après un titre. */
export const COMPTEUR = "font-sans text-[15px] font-normal tabular-nums tracking-normal text-steel";
/** Un texte secondaire (détail, date, lieu). */
export const SECONDAIRE = "text-[15px] text-steel";
/** Un montant. */
export const MONTANT = "font-semibold tabular-nums text-ink";

// ---- États -----------------------------------------------------------------

/** La tuile d'icône neutre devant une ligne (40 × 40). */
export const TUILE_ICONE = "grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-paper-warm text-ink";

export type Ton = "neutre" | "succes" | "attention" | "info" | "urgent" | "facture";

/** Une étiquette d'état (teinte opaque, ≥ 5,9:1). */
export const ETIQUETTE: Record<Ton, string> = {
  neutre: "bg-paper-warm text-steel",
  succes: "bg-succes-fond text-succes",
  attention: "bg-alerte-fond text-alerte-orange",
  info: "bg-bleu-fond text-bleu",
  urgent: "bg-signal-fond text-signal-fonce",
  facture: "bg-violet-fond text-violet",
};
/** La forme d'une étiquette (à combiner avec ETIQUETTE[ton]). */
export const FORME_ETIQUETTE = "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold";

/** Un montant en euros, sans coupure (« 4 820 € » ne se coupe jamais). */
export function euros(n: number, centimes = false): string {
  return n
    .toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: centimes ? 2 : 0, maximumFractionDigits: centimes ? 2 : 0 })
    // L'espace fine des milliers (U+202F) se voit à peine en petit : une
    // espace insécable normale, plus lisible (« 1 579 € »), jamais coupée.
    .replace(/[\s\u202f]/g, "\u00a0");
}
