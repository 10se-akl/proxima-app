// ============================================================
// Identité visuelle Compyo — voir BRAND.md à la racine du projet pour les
// règles d'utilisation complètes et la palette officielle.
//
// Le symbole (concept 1 du brief) : un grand arc ouvert (l'organisation,
// le suivi du chantier) et un petit cœur qui vient se loger dans son
// ouverture (l'attention portée à l'artisan — Compyo comme compagnon,
// pas comme simple outil froid). Les deux formes, une fois assemblées,
// se lisent comme un C — jamais un marteau, une maison ou un robot.
//
// Le cœur reprend le tracé standard Material Design (path largement
// utilisé et testé, pas redessiné à la main pour éviter une forme
// approximative), repositionné par transform pour se loger dans
// l'ouverture de l'arc.
//
// Composant unique pour toutes les déclinaisons (couleur / monochrome /
// blanc / noir), plutôt que des fichiers statiques dupliqués : une seule
// source de vérité, utilisée à la fois dans l'app (en-tête, pied de
// page) et exportée en SVG pur pour les fichiers de marque (voir
// public/brand/).
// ============================================================

// Tracé standard (Material Design), viewBox d'origine 0-24 — repositionné
// par transform dans le composant plutôt que recalculé point par point.
const TRACE_COEUR =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

export type VarianteMark = "couleur" | "mono" | "blanc" | "noir";

const COULEURS: Record<VarianteMark, { arc: string; forme: string }> = {
  couleur: { arc: "#C96B4A", forme: "#E8C5B6" },
  mono: { arc: "#1F2937", forme: "#1F2937" },
  blanc: { arc: "#FFFFFF", forme: "#FFFFFF" },
  noir: { arc: "#1F2937", forme: "#1F2937" },
};

export function CompyoMark({
  variante = "couleur",
  className,
  taille = 32,
}: {
  variante?: VarianteMark;
  className?: string;
  taille?: number;
}) {
  const { arc, forme } = COULEURS[variante];
  // "mono" et "blanc" utilisent une opacité réduite sur la forme pleine
  // pour garder la distinction visuelle entre les deux éléments même
  // sans le contraste de couleur — sinon le symbole redevient un simple
  // anneau plein en une seule teinte.
  const opaciteForme = variante === "couleur" ? 1 : variante === "blanc" ? 0.55 : 0.7;

  return (
    <svg
      viewBox="0 0 100 100"
      width={taille}
      height={taille}
      className={className}
      role="img"
      aria-label="Compyo"
    >
      <path
        d="M 74.04 74.04 A 34 34 0 1 1 74.04 25.96"
        fill="none"
        stroke={arc}
        strokeWidth={16}
        strokeLinecap="round"
      />
      {/* translate + scale positionnent le cœur (tracé d'origine 0-24)
          centré dans l'ouverture de l'arc, à la même place que l'ancien
          cercle plein. */}
      <g transform="translate(71.6,35.39) scale(1.2)">
        <path d={TRACE_COEUR} fill={forme} opacity={opaciteForme} />
      </g>
    </svg>
  );
}

// Symbole + nom, dans les deux compositions demandées.
export function CompyoLogo({
  variante = "couleur",
  orientation = "horizontal",
  className,
  tailleMark = 34,
}: {
  variante?: VarianteMark;
  orientation?: "horizontal" | "vertical";
  className?: string;
  tailleMark?: number;
}) {
  const couleurTexte = variante === "blanc" ? "#FFFFFF" : "#1F2937";

  return (
    <div
      className={`flex ${orientation === "vertical" ? "flex-col items-center gap-2" : "flex-row items-center gap-2.5"} ${className ?? ""}`}
    >
      <CompyoMark variante={variante} taille={tailleMark} />
      <span
        className="font-display font-semibold tracking-tight"
        style={{ color: couleurTexte, fontSize: tailleMark * 0.62 }}
      >
        Compyo
      </span>
    </div>
  );
}
