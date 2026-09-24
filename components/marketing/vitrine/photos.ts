// ============================================================
// Les emplacements photo de la vitrine (24/09).
//
// Aujourd'hui, aucun n'est rempli : chaque emplacement a un visuel de
// remplacement dessiné en CSS/SVG (le mur éclairé du hero, la matière de
// chaque métier, le crépuscule de la dernière section), pensé pour tenir
// seul. Le jour où les photos exclusives arrivent :
//
//   1. déposer le fichier dans public/visuels/ (AVIF ou WebP, 2400 px de
//      large pour le hero et la soirée, 1200 px pour un métier) ;
//   2. le déclarer ici.
//
// C'est tout : le cadre, le voile qui garde le texte lisible, le mode
// sombre, les tailles responsives et le chargement différé sont déjà en
// place (CadrePhoto.tsx). Aucune section n'est à reprendre.
//
// Direction artistique attendue (voir le brief du 24/09) : lumière
// naturelle, matières nobles, chantiers propres, très peu d'objets,
// beaucoup de profondeur. Aucune mise en scène caricaturale.
// ============================================================

export type Photo = {
  /** Chemin sous public/, par exemple "/visuels/hero.avif". */
  src: string;
  /** Ce qu'on voit sur la photo, pour les lecteurs d'écran. */
  alt: string;
  /** Cadrage (object-position), par défaut centré. */
  position?: string;
};

export const PHOTOS: {
  /** Derrière le titre de l'accueil. Le texte est à gauche : garder la
   *  partie gauche de l'image calme et claire. */
  hero?: Photo;
  /** La dernière section, « 19h04 ». Une lumière de fin de journée. */
  soiree?: Photo;
  /** Une photo par métier, indexée par l'identifiant de lib/metiersPages.ts
   *  ("plombier", "electricien"…). Format portrait (4:5). */
  metiers: Partial<Record<string, Photo>>;
} = {
  metiers: {},
};
