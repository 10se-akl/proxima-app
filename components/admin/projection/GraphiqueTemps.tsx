"use client";

import { useEffect, useRef, useState } from "react";
import { dateDuJour } from "@/lib/projection/moteur";

// ============================================================
// Graphique temporel zoomable de /admin/projection (05/10) — en SVG, sans
// bibliothèque. Tous les graphiques de la page partagent la même plage
// (en jours) et le même jour survolé : zoomer ou survoler l'un les règle
// tous.
//
// Zoom : boutons de la page, double-clic (×2 autour du point), Ctrl +
// molette ou pincement sur trackpad / écran tactile. Déplacement : glisser.
// Clavier (graphique sélectionné) : ← → pour se déplacer, + et − pour
// zoomer. Un clic choisit le jour détaillé sous les graphiques.
// ============================================================

export type Serie = {
  nom: string;
  couleur: string; // une couleur CSS bâtie sur les tokens (rgb(var(--c-…)))
  valeurs: ArrayLike<number>;
  forme?: "ligne" | "aire" | "pile";
  epaisseur?: number;
  attenuee?: boolean;
};

export type Plage = [number, number];

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const PLAGE_MIN = 7; // on ne zoome pas en dessous d'une semaine

export function bornerPlage([a, b]: Plage, total: number): Plage {
  let largeur = Math.max(PLAGE_MIN, Math.min(total - 1, b - a));
  let debut = Math.round(a);
  if (debut < 0) debut = 0;
  if (debut + largeur > total - 1) debut = total - 1 - largeur;
  largeur = Math.round(largeur);
  return [debut, debut + largeur];
}

function graduations(min: number, max: number, n: number): number[] {
  const etendue = max - min || 1;
  const brut = etendue / n;
  const p = Math.pow(10, Math.floor(Math.log10(brut)));
  const r = brut / p;
  const pas = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
  const t: number[] = [];
  for (let v = Math.floor(min / pas) * pas; v <= max + pas * 0.001; v += pas) t.push(Math.round(v * 1000) / 1000);
  if (t[t.length - 1] < max) t.push(t[t.length - 1] + pas);
  return t;
}

/** Les repères de l'axe du temps selon la largeur affichée. */
function reperesTemps(a: number, b: number): { jour: number; texte: string; fort: boolean }[] {
  const etendue = b - a;
  const out: { jour: number; texte: string; fort: boolean }[] = [];
  for (let d = Math.ceil(a); d <= b; d++) {
    const dt = dateDuJour(d);
    const j = dt.getUTCDate(), mo = dt.getUTCMonth(), an = dt.getUTCFullYear();
    if (etendue > 1100) {
      if (j === 1 && mo === 0) out.push({ jour: d, texte: String(an), fort: true });
    } else if (etendue > 400) {
      if (j === 1 && mo % 3 === 0) out.push({ jour: d, texte: mo === 0 ? String(an) : `${MOIS_COURTS[mo]}`, fort: mo === 0 });
    } else if (etendue > 75) {
      if (j === 1) out.push({ jour: d, texte: mo === 0 ? `${MOIS_COURTS[mo]} ${an}` : MOIS_COURTS[mo], fort: mo === 0 });
    } else if (etendue > 20) {
      if (dt.getUTCDay() === 1 || j === 1) out.push({ jour: d, texte: j === 1 ? `1er ${MOIS_COURTS[mo]}` : String(j), fort: j === 1 });
    } else {
      out.push({ jour: d, texte: j === 1 ? `1er ${MOIS_COURTS[mo]}` : String(j), fort: j === 1 });
    }
  }
  return out;
}

export function GraphiqueTemps({
  titre,
  series,
  plage,
  total,
  onPlage,
  survol,
  onSurvol,
  onChoisir,
  format,
  formatAxe,
  hauteur = 240,
  reperes = [],
  zeroVisible = true,
}: {
  titre: string;
  series: Serie[];
  plage: Plage;
  total: number;
  onPlage: (p: Plage) => void;
  survol: number | null;
  onSurvol: (j: number | null) => void;
  onChoisir?: (j: number) => void;
  format: (v: number) => string;
  formatAxe?: (v: number) => string;
  hauteur?: number;
  reperes?: { jour: number; texte: string }[];
  zeroVisible?: boolean;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(640);
  const glisse = useRef<{ x: number; plage: Plage; bouge: boolean } | null>(null);
  const pointeurs = useRef(new Map<number, number>());
  const pince = useRef<{ distance: number; plage: Plage; centre: number } | null>(null);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargeur(Math.max(300, el.clientWidth)));
    ro.observe(el);
    setLargeur(Math.max(300, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const mg = { h: 10, d: 12, b: 26, g: 58 };
  const [a, b] = plage;
  const zoneL = largeur - mg.g - mg.d;
  const X = (j: number) => mg.g + ((j - a) / (b - a)) * zoneL;
  const jourA = (px: number) => a + ((px - mg.g) / zoneL) * (b - a);

  // Valeurs visibles, regroupées au pixel près (moyenne) pour rester fluide.
  const pas = Math.max(1, Math.floor((b - a) / zoneL));
  const indices: number[] = [];
  for (let j = a; j <= b; j += pas) indices.push(j);
  if (indices[indices.length - 1] !== b) indices.push(b);
  const moyenne = (v: ArrayLike<number>, j: number) => {
    if (pas === 1) return v[j];
    let s = 0, n = 0;
    for (let k = j; k < Math.min(j + pas, b + 1); k++) { s += v[k]; n++; }
    return n ? s / n : v[j];
  };
  const piles = series.filter((s) => s.forme === "pile");
  const empilees: number[][] = [];
  if (piles.length) {
    let acc = indices.map(() => 0);
    for (const s of piles) {
      acc = acc.map((x, i) => x + moyenne(s.valeurs, indices[i]));
      empilees.push(acc.slice());
    }
  }
  let min = zeroVisible ? 0 : Infinity, max = zeroVisible ? 0 : -Infinity;
  series.filter((s) => s.forme !== "pile").forEach((s) => indices.forEach((j) => { const v = moyenne(s.valeurs, j); if (v < min) min = v; if (v > max) max = v; }));
  if (empilees.length) empilees[empilees.length - 1].forEach((v) => { if (v > max) max = v; if (v < min) min = v; });
  if (!isFinite(min)) { min = 0; max = 1; }
  // Quelques euros sous zéro (les premiers jours) ne justifient pas une
  // graduation négative entière : l'axe reste à zéro.
  if (min < 0 && max > 0 && -min < 0.02 * max) min = 0;
  if (max === min) max = min + 1;
  const ticks = graduations(min, max, 4);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const Y = (v: number) => mg.h + (hauteur - mg.h - mg.b) * (1 - (v - yMin) / (yMax - yMin));
  const chemin = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${X(indices[i]).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");

  // ---- Interactions --------------------------------------------------------
  function zoomer(facteur: number, centre: number) {
    const nouvelle = Math.max(PLAGE_MIN, Math.min(total - 1, (b - a) * facteur));
    const ratio = (centre - a) / (b - a);
    onPlage(bornerPlage([centre - ratio * nouvelle, centre - ratio * nouvelle + nouvelle], total));
  }
  function pxDepuisEvenement(e: { clientX: number }) {
    const r = boite.current!.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * largeur;
  }
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    // Ctrl + molette (et le pincement des trackpads, qui en émet) : zoom.
    // La molette seule fait défiler la page, comme partout.
    const molette = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomer(e.deltaY > 0 ? 1.25 : 0.8, jourA(pxDepuisEvenement(e)));
    };
    el.addEventListener("wheel", molette, { passive: false });
    return () => el.removeEventListener("wheel", molette);
  });

  const jourSurvole = survol !== null && survol >= a && survol <= b ? survol : null;

  return (
    <div className="relative" ref={boite}>
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        className="block h-auto w-full touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
        role="img"
        aria-label={`${titre}. Glisser pour se déplacer, double-cliquer ou Ctrl + molette pour zoomer.`}
        tabIndex={0}
        onKeyDown={(e) => {
          const pasJours = Math.max(1, Math.round((b - a) / 10));
          if (e.key === "ArrowRight") onPlage(bornerPlage([a + pasJours, b + pasJours], total));
          else if (e.key === "ArrowLeft") onPlage(bornerPlage([a - pasJours, b - pasJours], total));
          else if (e.key === "+" || e.key === "=") zoomer(0.5, (a + b) / 2);
          else if (e.key === "-") zoomer(2, (a + b) / 2);
          else return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          pointeurs.current.set(e.pointerId, e.clientX);
          if (pointeurs.current.size === 2) {
            const xs = Array.from(pointeurs.current.values());
            pince.current = { distance: Math.abs(xs[0] - xs[1]) || 1, plage, centre: jourA(pxDepuisEvenement({ clientX: (xs[0] + xs[1]) / 2 })) };
            glisse.current = null;
          } else {
            glisse.current = { x: e.clientX, plage, bouge: false };
          }
        }}
        onPointerMove={(e) => {
          if (pointeurs.current.has(e.pointerId)) pointeurs.current.set(e.pointerId, e.clientX);
          if (pince.current && pointeurs.current.size === 2) {
            const xs = Array.from(pointeurs.current.values());
            const facteur = pince.current.distance / (Math.abs(xs[0] - xs[1]) || 1);
            const [pa, pb] = pince.current.plage;
            const largeurJours = Math.max(PLAGE_MIN, Math.min(total - 1, (pb - pa) * facteur));
            const ratio = (pince.current.centre - pa) / (pb - pa);
            onPlage(bornerPlage([pince.current.centre - ratio * largeurJours, pince.current.centre - ratio * largeurJours + largeurJours], total));
            return;
          }
          const px = pxDepuisEvenement(e);
          if (glisse.current) {
            const r = boite.current!.getBoundingClientRect();
            const dx = ((e.clientX - glisse.current.x) / r.width) * largeur;
            if (Math.abs(dx) > 3) glisse.current.bouge = true;
            if (glisse.current.bouge) {
              const [ga, gb] = glisse.current.plage;
              const decalage = (dx / zoneL) * (gb - ga);
              onPlage(bornerPlage([ga - decalage, gb - decalage], total));
            }
          }
          const j = Math.round(jourA(px));
          onSurvol(j >= a && j <= b ? j : null);
        }}
        onPointerUp={(e) => {
          pointeurs.current.delete(e.pointerId);
          if (pointeurs.current.size < 2) pince.current = null;
          if (glisse.current && !glisse.current.bouge && onChoisir) {
            const j = Math.round(jourA(pxDepuisEvenement(e)));
            if (j >= a && j <= b) onChoisir(j);
          }
          glisse.current = null;
        }}
        onPointerCancel={(e) => {
          pointeurs.current.delete(e.pointerId);
          pince.current = null;
          glisse.current = null;
        }}
        onPointerLeave={() => onSurvol(null)}
        onDoubleClick={(e) => zoomer(0.5, jourA(pxDepuisEvenement(e)))}
      >
        {/* Grille et axe des valeurs */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={mg.g} x2={largeur - mg.d} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? "rgb(var(--c-ink) / 0.25)" : "rgb(var(--c-ink) / 0.07)"} />
            <text x={mg.g - 8} y={Y(t) + 4} textAnchor="end" fontSize={11} fill="rgb(var(--c-ink) / 0.5)" className="tabular-nums">
              {(formatAxe ?? format)(t)}
            </text>
          </g>
        ))}
        {/* Axe du temps */}
        {reperesTemps(a, b).map((r) => (
          <g key={r.jour}>
            <line x1={X(r.jour)} x2={X(r.jour)} y1={mg.h} y2={hauteur - mg.b} stroke={r.fort ? "rgb(var(--c-ink) / 0.1)" : "rgb(var(--c-ink) / 0.04)"} />
            <text x={X(r.jour)} y={hauteur - 8} textAnchor="middle" fontSize={11} fill="rgb(var(--c-ink) / 0.5)" fontWeight={r.fort ? 600 : 400}>
              {r.texte}
            </text>
          </g>
        ))}
        {/* Événements (lancement, embauches, étranger…) */}
        {reperes.filter((r) => r.jour >= a && r.jour <= b).map((r) => (
          <line key={`${r.jour}-${r.texte}`} x1={X(r.jour)} x2={X(r.jour)} y1={mg.h} y2={hauteur - mg.b} stroke="rgb(var(--c-signal) / 0.45)" strokeDasharray="0" strokeWidth={1}>
            <title>{r.texte}</title>
          </line>
        ))}
        {/* Aires empilées */}
        {empilees.map((haut, k) => {
          const bas = k ? empilees[k - 1] : indices.map(() => 0);
          let d = chemin(haut);
          for (let i = indices.length - 1; i >= 0; i--) d += ` L${X(indices[i]).toFixed(1)} ${Y(bas[i]).toFixed(1)}`;
          return <path key={piles[k].nom} d={`${d} Z`} fill={piles[k].couleur} fillOpacity={0.88} stroke="rgb(var(--c-surface))" strokeWidth={1} />;
        }).reverse()}
        {/* Lignes et aires simples */}
        {series.filter((s) => s.forme !== "pile").map((s) => {
          const vals = indices.map((j) => moyenne(s.valeurs, j));
          const d = chemin(vals);
          const base = Y(Math.max(yMin, Math.min(yMax, 0)));
          return (
            <g key={s.nom}>
              {s.forme === "aire" && (
                <path d={`${d} L${X(indices[indices.length - 1]).toFixed(1)} ${base} L${X(indices[0]).toFixed(1)} ${base} Z`} fill={s.couleur} fillOpacity={0.14} />
              )}
              <path d={d} fill="none" stroke={s.couleur} strokeWidth={s.epaisseur ?? 2} strokeLinejoin="round" strokeLinecap="round" strokeOpacity={s.attenuee ? 0.4 : 1} />
            </g>
          );
        })}
        {/* Jour survolé */}
        {jourSurvole !== null && (
          <g pointerEvents="none">
            <line x1={X(jourSurvole)} x2={X(jourSurvole)} y1={mg.h} y2={hauteur - mg.b} stroke="rgb(var(--c-ink) / 0.55)" />
            {series.filter((s) => s.forme !== "pile").map((s) => (
              <circle key={s.nom} cx={X(jourSurvole)} cy={Y(s.valeurs[jourSurvole])} r={4} fill={s.couleur} stroke="rgb(var(--c-surface))" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {jourSurvole !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[12rem] rounded-xl border border-ink/10 bg-surface px-3 py-2 text-xs shadow-lg shadow-ink/10"
          style={(X(jourSurvole) / largeur) > 0.6 ? { right: `${(1 - X(jourSurvole) / largeur) * 100 + 2}%` } : { left: `${(X(jourSurvole) / largeur) * 100 + 2}%` }}
        >
          <p className="mb-1 text-ink/55">
            {dateDuJour(jourSurvole).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
          </p>
          {[...series].reverse().map((s) => (
            <p key={s.nom} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-ink/65">
                <span aria-hidden className="inline-block h-0.5 w-3.5 rounded" style={{ background: s.couleur }} />
                {s.nom}
              </span>
              <strong className="tabular-nums">{format(s.valeurs[jourSurvole])}</strong>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** La frise de tout le scénario, avec la fenêtre affichée : on la glisse ou
 *  on tire ses bords pour choisir la période. */
export function Navigateur({
  valeurs,
  couleur,
  plage,
  total,
  onPlage,
}: {
  valeurs: ArrayLike<number>;
  couleur: string;
  plage: Plage;
  total: number;
  onPlage: (p: Plage) => void;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(640);
  const action = useRef<{ type: "deplacer" | "gauche" | "droite"; x: number; plage: Plage } | null>(null);
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargeur(Math.max(300, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = 54;
  const X = (j: number) => (j / (total - 1)) * largeur;
  let max = 0;
  for (let j = 0; j < total; j++) if (valeurs[j] > max) max = valeurs[j];
  const pas = Math.max(1, Math.floor(total / largeur));
  let d = "";
  for (let j = 0; j < total; j += pas) d += `${j ? "L" : "M"}${X(j).toFixed(1)} ${(h - 6 - ((valeurs[j] / (max || 1)) * (h - 12))).toFixed(1)} `;
  const [a, b] = plage;

  function deplacer(clientX: number) {
    const act = action.current;
    if (!act) return;
    const r = boite.current!.getBoundingClientRect();
    const dj = ((clientX - act.x) / r.width) * (total - 1);
    const [pa, pb] = act.plage;
    if (act.type === "deplacer") onPlage(bornerPlage([pa + dj, pb + dj], total));
    if (act.type === "gauche") onPlage(bornerPlage([Math.min(pa + dj, pb - PLAGE_MIN), pb], total));
    if (act.type === "droite") onPlage(bornerPlage([pa, Math.max(pb + dj, pa + PLAGE_MIN)], total));
  }

  return (
    <div ref={boite} className="relative select-none touch-none">
      <svg
        viewBox={`0 0 ${largeur} ${h}`}
        className="block h-[54px] w-full"
        aria-hidden
        onPointerDown={(e) => {
          // Un appui hors de la fenêtre la centre à cet endroit.
          const r = boite.current!.getBoundingClientRect();
          const j = ((e.clientX - r.left) / r.width) * (total - 1);
          if (j < a || j > b) onPlage(bornerPlage([j - (b - a) / 2, j + (b - a) / 2], total));
        }}
      >
        <rect x={0} y={0} width={largeur} height={h} rx={10} fill="rgb(var(--c-ink) / 0.04)" />
        <path d={d} fill="none" stroke={couleur} strokeWidth={1.5} />
        <rect x={0} y={0} width={X(a)} height={h} fill="rgb(var(--c-paper) / 0.65)" />
        <rect x={X(b)} y={0} width={largeur - X(b)} height={h} fill="rgb(var(--c-paper) / 0.65)" />
      </svg>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Période affichée"
        aria-valuemin={0}
        aria-valuemax={total - 1}
        aria-valuenow={a}
        aria-valuetext={`du ${dateDuJour(a).toLocaleDateString("fr-FR", { timeZone: "UTC" })} au ${dateDuJour(b).toLocaleDateString("fr-FR", { timeZone: "UTC" })}`}
        className="absolute top-0 h-[54px] cursor-grab rounded-[10px] border-2 border-signal bg-signal/[0.06] active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
        style={{ left: `${(a / (total - 1)) * 100}%`, width: `${Math.max(1.5, ((b - a) / (total - 1)) * 100)}%` }}
        onKeyDown={(e) => {
          const pasJours = Math.max(1, Math.round((b - a) / 5));
          if (e.key === "ArrowRight") onPlage(bornerPlage([a + pasJours, b + pasJours], total));
          else if (e.key === "ArrowLeft") onPlage(bornerPlage([a - pasJours, b - pasJours], total));
          else return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.target as Element).setPointerCapture(e.pointerId);
          action.current = { type: "deplacer", x: e.clientX, plage };
        }}
        onPointerMove={(e) => deplacer(e.clientX)}
        onPointerUp={() => (action.current = null)}
      >
        {(["gauche", "droite"] as const).map((cote) => (
          <span
            key={cote}
            aria-hidden
            className={`absolute top-1/2 h-8 w-3 -translate-y-1/2 cursor-ew-resize rounded-full bg-signal ${cote === "gauche" ? "-left-1.5" : "-right-1.5"}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as Element).setPointerCapture(e.pointerId);
              action.current = { type: cote, x: e.clientX, plage };
            }}
            onPointerMove={(e) => deplacer(e.clientX)}
            onPointerUp={() => (action.current = null)}
          />
        ))}
      </div>
    </div>
  );
}
