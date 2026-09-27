import type { Capture, Cible, IdCapture } from "@/lib/guide/contenu";

// ============================================================
// Une capture de l'application, et par-dessus ce qu'il faut toucher
// (27/09) : le bouton entouré, une flèche s'il n'y en a qu'un, des numéros
// ①②③ s'il y en a plusieurs (le texte de l'étape renvoie aux mêmes).
//
// Deux versions de chaque capture, sombre et claire, comme l'application :
// seule celle du thème affiché est téléchargée (l'autre est masquée, et
// une image masquée « lazy » n'est jamais chargée).
//
// Le dessin est en coordonnées de la capture (écran de 390 px de large) :
// il suit l'image quelle que soit sa taille à l'écran. Couleurs par les
// tokens : le liseré autour des traits prend la couleur du fond de page,
// donc celle de la capture affichée.
// ============================================================

const ECART = 5; // entre le bouton et son cadre
const LONGUEUR = 44; // de la flèche

type Trait = { x1: number; y1: number; x2: number; y2: number };

/** La flèche vers une cible : de préférence au-dessus ou en dessous, sinon
 *  sur le côté ; aucune s'il n'y a pas la place, ni pour un bouton qui
 *  prend presque toute la largeur (le cadre suffit, et une flèche
 *  barrerait le texte voisin). */
function trajetFleche(c: Cible, W: number, H: number): Trait | null {
  if (c.w > W * 0.75) return null;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const dx = cx < W / 2 ? 24 : -24;
  const dessus = c.y - ECART - 4;
  const dessous = c.y + c.h + ECART + 4;
  const ordre = cy > H * 0.5 ? ["dessus", "dessous"] : ["dessous", "dessus"];
  for (const cote of ordre) {
    if (cote === "dessus" && dessus - LONGUEUR >= 10) return { x1: cx + dx, y1: dessus - LONGUEUR, x2: cx, y2: dessus };
    if (cote === "dessous" && dessous + LONGUEUR <= H - 10) return { x1: cx + dx, y1: dessous + LONGUEUR, x2: cx, y2: dessous };
  }
  const gauche = c.x - ECART - 4;
  const droite = c.x + c.w + ECART + 4;
  if (gauche - LONGUEUR >= 10) return { x1: gauche - LONGUEUR, y1: cy - 16, x2: gauche, y2: cy };
  if (droite + LONGUEUR <= W - 10) return { x1: droite + LONGUEUR, y1: cy - 16, x2: droite, y2: cy };
  return null;
}

function pointe({ x1, y1, x2, y2 }: Trait): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const l = 13;
  const a = 0.5;
  const p1 = [x2 - l * Math.cos(angle - a), y2 - l * Math.sin(angle - a)];
  const p2 = [x2 - l * Math.cos(angle + a), y2 - l * Math.sin(angle + a)];
  return `${x2},${y2} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
}

export function CaptureAnnotee({ id, capture, alt }: { id: IdCapture; capture: Capture; alt: string }) {
  const { largeur: W, hauteur: H, cibles } = capture;
  const numeros = cibles.length > 1;

  return (
    <figure className="relative mx-auto w-full max-w-[330px] overflow-hidden rounded-[1.4rem] bg-paper shadow-[0_18px_40px_-24px_rgb(0_0_0/0.45)] ring-1 ring-ink/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/guide/${id}.webp`}
        width={W}
        height={H}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="hidden h-auto w-full dark:block"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/guide/${id}-clair.webp`}
        width={W}
        height={H}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full dark:hidden"
      />
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
        {cibles.map((c, i) => {
          const trait = numeros ? null : trajetFleche(c, W, H);
          const bx = Math.min(Math.max(c.x - ECART + 3, 15), W - 15);
          const by = Math.min(Math.max(c.y - ECART + 3, 15), H - 15);
          return (
            <g key={i}>
              {/* Le cadre, avec un liseré couleur du fond pour se détacher. */}
              <rect
                x={c.x - ECART}
                y={c.y - ECART}
                width={c.w + ECART * 2}
                height={c.h + ECART * 2}
                rx={13}
                fill="none"
                className="stroke-paper"
                strokeWidth={7}
                strokeOpacity={0.85}
              />
              <rect
                x={c.x - ECART}
                y={c.y - ECART}
                width={c.w + ECART * 2}
                height={c.h + ECART * 2}
                rx={13}
                fill="none"
                className="stroke-signal"
                strokeWidth={3}
              />
              {trait && (
                <>
                  <line {...trait} className="stroke-paper" strokeWidth={8} strokeLinecap="round" strokeOpacity={0.85} />
                  <polygon points={pointe(trait)} className="fill-paper stroke-paper" strokeWidth={6} strokeLinejoin="round" strokeOpacity={0.85} />
                  <line {...trait} className="stroke-signal" strokeWidth={3.5} strokeLinecap="round" />
                  <polygon points={pointe(trait)} className="fill-signal stroke-signal" strokeWidth={1.5} strokeLinejoin="round" />
                </>
              )}
              {numeros && (
                <>
                  <circle cx={bx} cy={by} r={13} className="fill-signal stroke-paper" strokeWidth={3} />
                  <text
                    x={bx}
                    y={by}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-white"
                    fontSize={14}
                    fontWeight={700}
                  >
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
