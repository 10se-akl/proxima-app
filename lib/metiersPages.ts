// ============================================================
// Les dix-huit métiers et leurs pages (20/09).
//
// L'ARCHITECTURE est complète : dix-huit adresses /metiers/[slug],
// générées en statique, avec leurs métadonnées. Le CONTENU, lui, est
// progressif : trois pages seulement sont écrites pour de bon
// (plaquiste, menuisier, plombier — les métiers les plus représentés
// dans la liste de prospects, donc les seuls qui recevront du trafic
// réel dans les prochaines semaines).
//
// Les quinze autres sont en `noindex` et absentes du sitemap tant
// qu'elles n'ont pas de contenu propre. C'est volontaire : quinze pages
// quasi identiques font baisser tout le domaine dans les résultats de
// recherche — Google traite le contenu dupliqué ou creux comme un signal
// négatif, et la sanction ne s'arrête pas aux pages concernées. Écrire
// une page, c'est donc passer `redigee` à true ET ajouter son contenu
// dans components/marketing/metiers/contenusMetiers.ts. Rien d'autre.
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
  { slug: "macon", nom: "Maçon", id: "macon", article: "un", redigee: false },
  { slug: "terrassier", nom: "Terrassier", id: "terrassier", article: "un", redigee: false },
  { slug: "facadier", nom: "Façadier", id: "facadier", article: "un", redigee: false },
  { slug: "plombier", nom: "Plombier", id: "plombier", article: "un", redigee: true },
  { slug: "chauffagiste", nom: "Chauffagiste", id: "chauffagiste", article: "un", redigee: false },
  { slug: "climaticien", nom: "Climaticien", id: "climaticien", article: "un", redigee: false },
  { slug: "electricien", nom: "Électricien", id: "electricien", article: "un", redigee: false },
  { slug: "serrurier", nom: "Serrurier", id: "serrurier", article: "un", redigee: false },
  { slug: "vitrier", nom: "Vitrier", id: "vitrier", article: "un", redigee: false },
  { slug: "couvreur", nom: "Couvreur", id: "couvreur", article: "un", redigee: false },
  { slug: "charpentier", nom: "Charpentier", id: "charpentier", article: "un", redigee: false },
  { slug: "menuisier", nom: "Menuisier", id: "menuisier", article: "un", redigee: true },
  { slug: "plaquiste", nom: "Plaquiste", id: "plaquiste", article: "un", redigee: true },
  { slug: "peintre", nom: "Peintre", id: "peintre", article: "un", redigee: false },
  { slug: "carreleur", nom: "Carreleur", id: "carreleur", article: "un", redigee: false },
  { slug: "paysagiste", nom: "Paysagiste", id: "paysagiste", article: "un", redigee: false },
  { slug: "pisciniste", nom: "Pisciniste", id: "pisciniste", article: "un", redigee: false },
  {
    slug: "entreprise-de-renovation",
    nom: "Entreprise de rénovation",
    id: "renovation",
    article: "une",
    redigee: false,
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
