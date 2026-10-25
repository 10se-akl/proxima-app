// ============================================================
// Squelette de chargement (10/09) — recherche terrain sur la charge
// mentale des artisans du BTP + relecture Cowork de cette recherche :
// "le temps-à-premier-résultat perçu doit rester la priorité n°1", quitte
// à sacrifier un peu d'esthétique pur. Aucune des pages principales du
// dashboard (toutes des Server Components qui interrogent Supabase avant
// de rendre quoi que ce soit) n'avait de loading.tsx — chaque navigation
// laissait donc l'écran figé/blanc le temps de la requête, surtout
// pénible sur un réseau de chantier faible.
//
// Refonte (02/10) — règle 11 de docs/langage-interface.md : le squelette
// est la vraie ligne vidée (même hauteur, même rayon, même filet), et la
// pulsation ne joue que si l'artisan n'a pas demandé moins de mouvement.
//
// Design v3 (24/10) : à la forme exacte des nouveaux écrans — titre de
// 30 px, cartes de rayon 20 sur surface à l'ombre douce (sans contour),
// lignes de 68 px séparées d'un filet, vignettes de 40 ou 56 px. Les
// barres sont en creux (paper-warm) et pulsent lentement (2,4 s).
// ============================================================
import { CARTE, GROUPE } from "@/components/ui/recettes";
import { CLASSE_PAGE_ETROITE } from "@/components/ui/EnTetePage";

const PULSATION = "motion-safe:animate-pulse motion-safe:[animation-duration:2.4s]";

export function Skeleton({ className = "" }: { className?: string }) {
  // rounded-xl par défaut, et pas rounded-full : dans la feuille générée par
  // Tailwind, « full » passe après « 2xl » et écraserait l'arrondi demandé
  // par l'appelant. Les barres de texte passent rounded-full elles-mêmes.
  // Design v3 : l'arrondi par défaut ne s'ajoute que si l'appelant n'en
  // donne pas (deux arrondis se disputeraient l'ordre de la feuille).
  const arrondi = /(^|\s)rounded/.test(className) ? "" : "rounded-xl";
  return <div className={`${PULSATION} ${arrondi} bg-paper-warm ${className}`} />;
}

/** Une ligne de liste vide (68 px), à poser dans un SqueletteGroupe.
 *  `vignette` : 40 (avatar, tuile d'icône) ou 56 (photo de projet). */
export function SkeletonLigne({ vignette = 40 }: { vignette?: 40 | 56 }) {
  return (
    <div className="flex min-h-[4.25rem] items-center gap-3 px-4 py-3">
      <Skeleton className={vignette === 56 ? "h-14 w-14 shrink-0 rounded-[14px]" : "h-10 w-10 shrink-0 rounded-[12px]"} />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-2/5 max-w-[12rem] rounded-full" />
        <Skeleton className="mt-2 h-3.5 w-3/5 max-w-[16rem] rounded-full" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0 rounded-full" />
    </div>
  );
}

/** Une carte de lignes vides (la forme de GROUPE). */
export function SqueletteGroupe({ lignes = 4, vignette = 40 }: { lignes?: number; vignette?: 40 | 56 }) {
  return (
    <div className={GROUPE}>
      {Array.from({ length: lignes }, (_, i) => (
        <SkeletonLigne key={i} vignette={vignette} />
      ))}
    </div>
  );
}

/** Une ligne isolée, en carte (gardée pour les appelants existants). */
export function SkeletonCarte({ className = "" }: { className?: string }) {
  return (
    <div className={`flex min-h-[4.25rem] items-center gap-3 px-4 ${CARTE} ${className}`}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-[12px]" />
      <Skeleton className="h-4 max-w-xs flex-1 rounded-full" />
    </div>
  );
}

/** Le titre d'un écran vidé : 30 px (36 sur ordinateur), et sa phrase. */
export function SqueletteTitre({ sousTitre = true }: { sousTitre?: boolean }) {
  return (
    <div>
      <Skeleton className="h-[1.875rem] w-44 rounded-full sm:h-9" />
      {sousTitre && <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-full" />}
    </div>
  );
}

/** Le squelette d'une page « en-tête + lignes », pour les chargements
 *  côté client (fiche, notes, paramètres, rendez-vous). */
export function SquelettePage({ lignes = 4 }: { lignes?: number }) {
  return (
    <div className={CLASSE_PAGE_ETROITE} aria-busy="true" aria-label="Chargement">
      <SqueletteTitre />
      <div className="mt-6">
        <SqueletteGroupe lignes={lignes} />
      </div>
    </div>
  );
}
