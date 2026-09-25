// ============================================================
// Les dix-huit métiers et leurs pages.
//
// 20/09 : l'architecture complète (dix-huit adresses /metiers/[slug],
// générées en statique) et trois pages écrites ; les quinze autres en
// `noindex`, hors sitemap, tant qu'elles n'avaient pas de contenu propre —
// quinze pages quasi identiques font baisser tout le domaine.
//
// 25/09 : les dix-huit sont écrites (components/marketing/metiers/
// contenusMetiers.ts : une scène, trois points, une FAQ propre au métier)
// et entrent dans l'index. La page pilier /metiers les rassemble.
//
// Le drapeau `redigee` reste : un métier ajouté plus tard naît en
// `noindex` tant que son texte n'est pas écrit.
// ============================================================

export type FicheMetier = {
  slug: string;
  /** Exactement le libellé de lib/metiers.ts : c'est ce que l'artisan a
   *  choisi à l'inscription, il ne doit pas exister deux orthographes. */
  nom: string;
  /** Identifiant partagé avec exemplesMetiers.ts et les dessins. */
  id: string;
  /** Article + métier, pour les phrases : « Compyo pour un plombier ». */
  article: "un" | "une";
  /** Le contenu propre est-il écrit ? Sinon : noindex, hors sitemap. */
  redigee: boolean;
};

export const FICHES_METIERS: FicheMetier[] = [
  { slug: "macon", nom: "Maçon", id: "macon", article: "un", redigee: true },
  { slug: "terrassier", nom: "Terrassier", id: "terrassier", article: "un", redigee: true },
  { slug: "facadier", nom: "Façadier", id: "facadier", article: "un", redigee: true },
  { slug: "plombier", nom: "Plombier", id: "plombier", article: "un", redigee: true },
  { slug: "chauffagiste", nom: "Chauffagiste", id: "chauffagiste", article: "un", redigee: true },
  { slug: "climaticien", nom: "Climaticien", id: "climaticien", article: "un", redigee: true },
  { slug: "electricien", nom: "Électricien", id: "electricien", article: "un", redigee: true },
  { slug: "serrurier", nom: "Serrurier", id: "serrurier", article: "un", redigee: true },
  { slug: "vitrier", nom: "Vitrier", id: "vitrier", article: "un", redigee: true },
  { slug: "couvreur", nom: "Couvreur", id: "couvreur", article: "un", redigee: true },
  { slug: "charpentier", nom: "Charpentier", id: "charpentier", article: "un", redigee: true },
  { slug: "menuisier", nom: "Menuisier", id: "menuisier", article: "un", redigee: true },
  { slug: "plaquiste", nom: "Plaquiste", id: "plaquiste", article: "un", redigee: true },
  { slug: "peintre", nom: "Peintre", id: "peintre", article: "un", redigee: true },
  { slug: "carreleur", nom: "Carreleur", id: "carreleur", article: "un", redigee: true },
  { slug: "paysagiste", nom: "Paysagiste", id: "paysagiste", article: "un", redigee: true },
  { slug: "pisciniste", nom: "Pisciniste", id: "pisciniste", article: "un", redigee: true },
  {
    slug: "entreprise-de-renovation",
    nom: "Entreprise de rénovation",
    id: "renovation",
    article: "une",
    redigee: true,
  },
];

export const FICHE_PAR_SLUG: Record<string, FicheMetier> = Object.fromEntries(
  FICHES_METIERS.map((f) => [f.slug, f])
);

export const FICHE_PAR_ID: Record<string, FicheMetier> = Object.fromEntries(
  FICHES_METIERS.map((f) => [f.id, f])
);

/** Les seules pages métier à référencer (sitemap, liens internes). */
export const FICHES_REDIGEES = FICHES_METIERS.filter((f) => f.redigee);
