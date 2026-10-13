import type { Appareil, Capture, Cible, IdCapture } from "@/lib/guide/contenu";

// ============================================================
// Une capture de l'application, et par-dessus ce qu'il faut toucher
// (27/09) : le bouton entouré, une flèche s'il n'y en a qu'un, des numéros
// ①②③ s'il y en a plusieurs (le texte de l'étape renvoie aux mêmes).
//
// Deux versions de chaque capture, sombre et claire, comme l'application :
// seule celle du thème affiché est téléchargée (l'autre est masquée, et
// une image masquée « lazy » n'est jamais chargée).
//
// 13/10 — et deux appareils : la capture du téléphone (écran de 390 px)
// et celle de l'ordinateur (une partie d'un écran de 1280 px). Le dessin
// est en coordonnées de la capture ; sur l'ordinateur, où la capture est
// réduite à l'affichage, les traits et les numéros sont agrandis d'autant
// pour garder la même taille à l'écran.
// ============================================================

type Trait = { x1: number; y1: number; x2: number; y2: number };

/** La flèche vers une cible : de préférence au-dessus ou en dessous, sinon
 *  sur le côté ; aucune s'il n'y a pas la place, ni pour un bouton qui
 *  prend presque toute la largeur (le cadre suffit, et une flèche
 *  barrerait le texte voisin). */
function trajetFleche(c: Cible, W: number, H: number, ecart: number, longueur: number): Trait | null {
  if (c.w > W * 0.75) return null;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const dx = (cx < W / 2 ? 24 : -24) * (longueur / 44);
  const dessus = c.y - ecart - 4;
  const dessous = c.y + c.h + ecart + 4;
  const ordre = cy > H * 0.5 ? ["dessus", "dessous"] : ["dessous", "dessus"];
  for (const cote of ordre) {
    if (cote === "dessus" && dessus - longueur >= 10) return { x1: cx + dx, y1: dessus - longueur, x2: cx, y2: dessus };
    if (cote === "dessous" && dessous + longueur <= H - 10) return { x1: cx + dx, y1: dessous + longueur, x2: cx, y2: dessous };
  }
  const gauche = c.x - ecart - 4;
  const droite = c.x + c.w + ecart + 4;
  if (gauche - longueur >= 10) return { x1: gauche - longueur, y1: cy - 16, x2: gauche, y2: cy };
  if (droite + longueur <= W - 10) return { x1: droite + longueur, y1: cy - 16, x2: droite, y2: cy };
  return null;
}

function pointe({ x1, y1, x2, y2 }: Trait, l: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a = 0.5;
  const p1 = [x2 - l * Math.cos(angle - a), y2 - l * Math.sin(angle - a)];
  const p2 = [x2 - l * Math.cos(angle + a), y2 - l * Math.sin(angle + a)];
  return `${x2},${y2} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
}

export function CaptureAnnotee({
  id,
  appareil,
  capture,
  alt,
}: {
  id: IdCapture;
  appareil: Appareil;
  capture: Capture;
  alt: string;
}) {
  const { largeur: W, hauteur: H, cibles } = capture;
  const numeros = cibles.length > 1;
  // Sur l'ordinateur, la capture s'affiche à 720 px au plus.
  const k = appareil === "ordinateur" ? Math.max(1, W / 720) : 1;
  const ecart = 5 * k;
  const longueur = 44 * k;
  const nom = `${id}-${appareil}`;

  return (
    <figure
      className={`relative w-full overflow-hidden bg-paper shadow-[0_18px_40px_-24px_rgb(0_0_0/0.45)] ring-1 ring-ink/10 ${
        appareil === "telephone" ? "mx-auto max-w-[330px] rounded-[1.4rem]" : "max-w-[720px] rounded-2xl"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/guide/${nom}.webp`} width={W} height={H} alt={alt} loading="lazy" decoding="async" className="hidden h-auto w-full dark:block" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/guide/${nom}-clair.webp`} width={W} height={H} alt={alt} loading="lazy" decoding="async" className="block h-auto w-full dark:hidden" />
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
        {cibles.map((c, i) => {
          const trait = numeros ? null : trajetFleche(c, W, H, ecart, longueur);
          const r = 13 * k;
          const bx = Math.min(Math.max(c.x - ecart + 3 * k, r + 2), W - r - 2);
          const by = Math.min(Math.max(c.y - ecart + 3 * k, r + 2), H - r - 2);
          return (
            <g key={i}>
              {/* Le cadre, avec un liseré couleur du fond pour se détacher. */}
              <rect
                x={c.x - ecart}
                y={c.y - ecart}
                width={c.w + ecart * 2}
                height={c.h + ecart * 2}
                rx={13 * k}
                fill="none"
                className="stroke-paper"
                strokeWidth={7 * k}
                strokeOpacity={0.85}
              />
              <rect
                x={c.x - ecart}
                y={c.y - ecart}
                width={c.w + ecart * 2}
                height={c.h + ecart * 2}
                rx={13 * k}
                fill="none"
                className="stroke-signal"
                strokeWidth={3 * k}
              />
              {trait && (
                <>
                  <line {...trait} className="stroke-paper" strokeWidth={8 * k} strokeLinecap="round" strokeOpacity={0.85} />
                  <polygon points={pointe(trait, 13 * k)} className="fill-paper stroke-paper" strokeWidth={6 * k} strokeLinejoin="round" strokeOpacity={0.85} />
                  <line {...trait} className="stroke-signal" strokeWidth={3.5 * k} strokeLinecap="round" />
                  <polygon points={pointe(trait, 13 * k)} className="fill-signal stroke-signal" strokeWidth={1.5 * k} strokeLinejoin="round" />
                </>
              )}
              {numeros && (
                <>
                  <circle cx={bx} cy={by} r={r} className="fill-signal stroke-paper" strokeWidth={3 * k} />
                  <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" className="fill-white" fontSize={14 * k} fontWeight={700}>
                    {i + 1}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
