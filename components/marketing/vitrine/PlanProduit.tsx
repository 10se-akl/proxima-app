import type { CSSProperties } from "react";

// ============================================================
// Le plan de l'application, qui se construit au défilement (05/10, idée
// d'Axel : « quand tu descends, le produit se construit »).
//
// Dans le fond de la vitrine, sur le quadrillage de plan d'architecte :
// le plan de l'écran d'accueil de Compyo. En haut de la page, rien n'est
// tracé ; en descendant, le contour du téléphone se dessine avec ses
// cotes, puis l'en-tête, les quatre compteurs qui prennent leur couleur,
// les projets, la barre du bas ; en bas de page, l'application est finie
// et le cartouche du plan passe de « Plan n° 01 » à « Chantier terminé ».
//
// Aucun calcul en JavaScript : chaque trait lit --v-p (l'avancement de la
// page, posé par FondVivant sur le fond) et sa propre fenêtre (--a, --d) ;
// le CSS fait le reste (vitrine.css, « plan du produit »). Avec « réduire
// les animations », le plan est simplement montré fini.
// ============================================================

type Var = CSSProperties & Record<`--${string}`, string | number>;

/** Un rectangle arrondi en chemin (pour que le trait se dessine). */
function rr(x: number, y: number, l: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + l - r}A${r} ${r} 0 0 1 ${x + l} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + l - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}
function rond(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z`;
}

/** Un trait qui se dessine entre a et a + d. */
function Trait({ d, a, duree = 0.05, epais = false }: { d: string; a: number; duree?: number; epais?: boolean }) {
  return <path d={d} pathLength={1} className={epais ? "v-pp-trait v-pp-epais" : "v-pp-trait"} style={{ "--a": a, "--d": duree } as Var} />;
}

/** Une surface qui se remplit à partir de b. */
function Plein({ d, b, couleur, opacite = 0.55 }: { d: string; b: number; couleur: string; opacite?: number }) {
  return <path d={d} className="v-pp-plein" style={{ "--b": b, "--c": couleur, "--o": opacite } as Var} />;
}

const SIGNAL = "rgb(201 107 74)";
const TUILES = [
  { x: 60, y: 320, a: 0.34, c: "rgb(59 130 246)" },
  { x: 215, y: 320, a: 0.37, c: "rgb(47 143 91)" },
  { x: 60, y: 414, a: 0.4, c: "rgb(139 92 246)" },
  { x: 215, y: 414, a: 0.43, c: "rgb(217 134 26)" },
];
const ETIQUETTES = ["rgb(47 143 91)", "rgb(59 130 246)", "rgb(139 92 246)"];

export function PlanProduit() {
  return (
    <svg viewBox="0 0 420 880" className="v-plan-produit" aria-hidden>
      {/* Les cotes, comme sur un plan : elles s'effacent quand c'est fini. */}
      <g className="v-pp-cotes">
        <Trait d="M14 40V800M8 40H20M8 800H20" a={0.05} duree={0.08} />
        <Trait d="M30 822H390M30 816V828M390 816V828" a={0.06} duree={0.08} />
        <text x="6" y="424" className="v-pp-texte" style={{ "--b": 0.1 } as Var} transform="rotate(-90 6 424)">
          844
        </text>
        <text x="200" y="842" className="v-pp-texte" style={{ "--b": 0.11 } as Var}>
          390
        </text>
      </g>

      {/* Le téléphone */}
      <Plein d={rr(44, 54, 332, 732, 44)} b={0.82} couleur="rgb(13 22 38)" opacite={0.7} />
      <Trait d={rr(30, 40, 360, 760, 56)} a={0.03} duree={0.1} epais />
      <Trait d={rr(44, 54, 332, 732, 44)} a={0.08} duree={0.08} />
      <Plein d={rr(170, 66, 80, 22, 11)} b={0.12} couleur="rgb(5 8 15)" opacite={0.9} />
      <Trait d={rr(170, 66, 80, 22, 11)} a={0.11} duree={0.03} />

      {/* La barre de l'application */}
      <Trait d="M44 140H376" a={0.13} duree={0.04} />
      <Plein d={rond(78, 118, 11)} b={0.17} couleur={SIGNAL} opacite={0.9} />
      <Trait d={rond(78, 118, 11)} a={0.14} duree={0.03} />
      <Trait d={rr(98, 112, 64, 12, 6)} a={0.15} duree={0.03} />
      <Trait d={rond(346, 118, 14)} a={0.16} duree={0.03} />

      {/* L'en-tête : bonjour, maintenant */}
      <Plein d={rr(60, 154, 300, 150, 22)} b={0.28} couleur="rgb(10 17 31)" opacite={0.85} />
      <Plein d={rr(60, 154, 300, 150, 22)} b={0.3} couleur={SIGNAL} opacite={0.22} />
      <Trait d={rr(60, 154, 300, 150, 22)} a={0.2} duree={0.06} />
      <Trait d={rr(80, 176, 90, 8, 4)} a={0.23} duree={0.02} />
      <Plein d={rr(80, 194, 170, 18, 9)} b={0.27} couleur="rgb(255 255 255)" opacite={0.75} />
      <Trait d={rr(80, 194, 170, 18, 9)} a={0.24} duree={0.03} />
      <Trait d={rr(80, 220, 200, 8, 4)} a={0.25} duree={0.03} />
      <Trait d={rr(76, 240, 268, 48, 14)} a={0.26} duree={0.04} />
      <Plein d="M290 240H330A14 14 0 0 1 344 254V274A14 14 0 0 1 330 288H290Z" b={0.31} couleur={SIGNAL} opacite={0.95} />

      {/* Les quatre compteurs */}
      {TUILES.map((t) => (
        <g key={`${t.x}-${t.y}`}>
          <Trait d={rr(t.x, t.y, 145, 84, 18)} a={t.a} duree={0.05} />
          <Plein d={rond(t.x + 26, t.y + 28, 14)} b={t.a + 0.05} couleur={t.c} opacite={0.95} />
          <Trait d={rond(t.x + 26, t.y + 28, 14)} a={t.a + 0.02} duree={0.03} />
          <Plein d={rr(t.x + 48, t.y + 20, 26, 16, 6)} b={t.a + 0.07} couleur="rgb(255 255 255)" opacite={0.7} />
          <Trait d={rr(t.x + 16, t.y + 56, 90, 8, 4)} a={t.a + 0.03} duree={0.03} />
        </g>
      ))}

      {/* Mes projets */}
      <Trait d={rr(60, 512, 300, 206, 22)} a={0.5} duree={0.06} />
      <Trait d={rr(80, 530, 90, 12, 6)} a={0.54} duree={0.03} />
      {[0, 1, 2].map((i) => {
        const y = 556 + i * 52;
        const a = 0.56 + i * 0.04;
        return (
          <g key={i}>
            <Trait d={rr(72, y, 276, 44, 12)} a={a} duree={0.04} />
            <Plein d={rr(80, y + 5, 34, 34, 8)} b={a + 0.05} couleur={i === 1 ? "rgb(139 92 246)" : SIGNAL} opacite={0.6} />
            <Trait d={rr(80, y + 5, 34, 34, 8)} a={a + 0.02} duree={0.02} />
            <Trait d={rr(124, y + 10, 90, 9, 4)} a={a + 0.02} duree={0.02} />
            <Trait d={rr(124, y + 25, 60, 7, 3)} a={a + 0.03} duree={0.02} />
            <Plein d={rr(292, y + 15, 44, 14, 7)} b={a + 0.06} couleur={ETIQUETTES[i]} opacite={0.85} />
          </g>
        );
      })}

      {/* La barre du bas et son « + » */}
      <Trait d="M44 728H376" a={0.72} duree={0.04} />
      {[92, 150, 270, 328].map((x, i) => (
        <Trait key={x} d={rond(x, 754, 8)} a={0.74 + i * 0.01} duree={0.02} />
      ))}
      <Plein d={rond(210, 746, 22)} b={0.79} couleur={SIGNAL} opacite={1} />
      <Trait d={rond(210, 746, 22)} a={0.76} duree={0.03} />
      <Trait d="M210 736V756M200 746H220" a={0.8} duree={0.02} epais />

      {/* Le cartouche du plan */}
      <g className="v-pp-cartouche">
        <text x="390" y="868" textAnchor="end" className="v-pp-texte v-pp-titre" style={{ "--b": 0.02 } as Var}>
          PLAN N° 01 · APPLICATION COMPYO
        </text>
        <text x="390" y="868" textAnchor="end" className="v-pp-texte v-pp-fini" style={{ "--b": 0.86 } as Var}>
          CHANTIER TERMINÉ ✓
        </text>
      </g>
    </svg>
  );
}
