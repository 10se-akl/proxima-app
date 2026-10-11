import type { CSSProperties, ReactNode } from "react";
import { BARRES, MESSAGES, POINTS } from "./scenes";

// ============================================================
// Les plans du film, sur une scène de 1600 × 1000 (voir scenes.ts pour
// l'animation). Rien ne bouge ici : chaque élément porte un data-r que
// rendre() retrouve et place à chaque image.
// ============================================================

const PLAN = "absolute inset-0 overflow-hidden";
const TRAIT_ARC = "M 74.04 74.04 A 34 34 0 1 1 74.04 25.96";
const COEUR =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

const NUIT = "#0A111F";
const TERRACOTTA = "#C96B4A";
const BLEU = "#2F5BEA";
const CREME = "#F3EDE6";

function MotPlein({ id, mot, fond, couleur, children }: { id: string; mot: string; fond: string; couleur: string; children?: ReactNode }) {
  return (
    <div data-r={`plan-${id}`} className={PLAN} style={{ background: fond, visibility: "hidden" }}>
      <div className="absolute inset-0 grid place-items-center">
        <span data-r={`mot-${id}`} className="font-display font-extrabold leading-none tracking-[-0.05em]" style={{ fontSize: 330, color: couleur }}>
          {mot}
        </span>
      </div>
      {children}
    </div>
  );
}

export function Film() {
  return (
    <div className="relative h-[1000px] w-[1600px] overflow-hidden" style={{ background: NUIT, fontFamily: "var(--font-sans, Inter), Inter, sans-serif" }}>
      {/* 1. La grille et la ligne */}
      <div data-r="plan-grille" className={PLAN} style={{ background: NUIT }}>
        <div
          data-r="grille-fond"
          className="absolute -inset-20"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.22) 1.6px, transparent 2px)", backgroundSize: "64px 64px" }}
        />
        <div data-r="grille-ligne" className="absolute left-0 right-0 top-1/2 h-[4px] origin-left" style={{ background: TERRACOTTA, transform: "scaleX(0)", boxShadow: `0 0 30px ${TERRACOTTA}` }} />
        <p data-r="grille-texte" className="absolute left-0 right-0 top-[54%] text-center font-mono text-[22px] tracking-[0.3em] text-white/70" style={{ opacity: 0 }}>
          COMPYO · LE COMPAGNON DES ARTISANS
        </p>
      </div>

      {/* 2. COMPYO */}
      <div data-r="plan-marque" className={PLAN} style={{ background: TERRACOTTA, visibility: "hidden" }}>
        <div data-r="marque-cadre" className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="flex justify-center font-display font-extrabold leading-none tracking-[-0.05em] text-[#121212]" style={{ fontSize: 300 }}>
              {"COMPYO".split("").map((l, i) => (
                <span key={i} data-r="marque-lettre" className="inline-block" style={{ opacity: 0 }}>
                  {l}
                </span>
              ))}
            </div>
            <p data-r="marque-sous" className="mt-2 text-right font-display text-[52px] font-semibold italic text-[#121212]/85" style={{ opacity: 0 }}>
              le compagnon des artisans
            </p>
          </div>
        </div>
      </div>

      {/* 3. VOS · SOIRÉES · À VOUS */}
      <MotPlein id="vos" mot="VOS" fond={CREME} couleur="#121212" />
      <MotPlein id="soirees" mot="SOIRÉES" fond={NUIT} couleur="#FFFFFF" />
      <MotPlein id="avous" mot="À VOUS." fond={BLEU} couleur="#FFFFFF">
        {[
          "left-[300px] top-[300px] border-l-[6px] border-t-[6px]",
          "right-[300px] top-[300px] border-r-[6px] border-t-[6px]",
          "left-[300px] bottom-[300px] border-b-[6px] border-l-[6px]",
          "right-[300px] bottom-[300px] border-b-[6px] border-r-[6px]",
        ].map((c, i) => (
          <span key={i} data-r="crochet" className={`absolute h-[70px] w-[70px] border-white ${c}`} style={{ opacity: 0 }} />
        ))}
      </MotPlein>

      {/* 4. Le bilan */}
      <div data-r="plan-bilan" className={PLAN} style={{ background: "#F7F5F2", visibility: "hidden" }}>
        <div data-r="bilan-cadre" className="absolute inset-0">
          <p className="absolute left-[110px] top-[90px] font-mono text-[20px] tracking-[0.25em] text-[#121212]/50">BILAN DU MOIS · DÉMONSTRATION</p>
          <div data-r="bilan-gauche" className="absolute left-[110px] top-[200px]">
            <p data-r="bilan-montant" className="font-display text-[150px] font-extrabold leading-none tracking-[-0.04em] text-[#121212]">
              +0 €
            </p>
            <p className="mt-4 text-[34px] font-semibold text-[#121212]/60">de devis signés ce mois</p>
            <div className="mt-[90px] flex items-center gap-8">
              <svg width="190" height="190" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#121212" strokeOpacity=".1" strokeWidth="10" />
                <circle
                  data-r="bilan-anneau"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={TERRACOTTA}
                  strokeWidth="10"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset="1"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div>
                <p data-r="bilan-pc" className="font-display text-[72px] font-extrabold leading-none text-[#121212]">
                  0 %
                </p>
                <p className="mt-2 text-[28px] text-[#121212]/60">des devis acceptés</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-[140px] right-[110px] flex h-[560px] w-[640px] items-end gap-[16px]">
            {BARRES.map((h, i) => (
              <span
                key={i}
                data-r="bilan-barre"
                className="flex-1 origin-bottom rounded-t-[8px]"
                style={{ height: `${h}%`, background: i === BARRES.length - 1 ? TERRACOTTA : "#121212", transform: "scaleY(0)" }}
              />
            ))}
            <svg className="pointer-events-none absolute inset-0 overflow-visible" viewBox="0 0 640 560" preserveAspectRatio="none">
              <path
                data-r="bilan-courbe"
                d="M10 420 C 120 380, 160 400, 240 300 S 400 260, 470 170 S 590 90, 630 40"
                fill="none"
                stroke={TERRACOTTA}
                strokeWidth="6"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset="1"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 5. Les messages qui se rangent */}
      <div data-r="plan-messages" className={PLAN} style={{ background: NUIT, visibility: "hidden" }}>
        <p data-r="messages-titre" className="absolute left-0 right-0 top-[70px] text-center font-display text-[56px] font-extrabold tracking-[-0.03em] text-white" style={{ opacity: 0 }}>
          Chaque message devient un projet.
        </p>
        <div className="absolute left-1/2 top-[56%]">
          {MESSAGES.map((m, i) => (
            <div
              key={m.nom}
              data-r="bulle"
              className="absolute -ml-[220px] -mt-[66px] flex h-[132px] w-[440px] items-center gap-5 rounded-[28px] bg-white px-7 shadow-[0_30px_60px_rgba(0,0,0,.4)]"
              style={{ opacity: 0 }}
            >
              <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full font-display text-[28px] font-bold text-white" style={{ background: [TERRACOTTA, BLEU, "#2F8F5B", "#8B5CF6"][i % 4] }}>
                {m.nom.split(" ").pop()?.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block text-[30px] font-bold text-[#121212]">{m.nom}</span>
                <span className="block text-[25px] text-[#5C7080]">{m.texte}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Le devis */}
      <div data-r="plan-devis" className={PLAN} style={{ background: BLEU, visibility: "hidden" }}>
        <div className="absolute inset-0 grid place-items-center">
          <div data-r="devis-carte" className="relative w-[640px] rounded-[40px] bg-white p-[44px] text-[#121212] shadow-[0_60px_120px_rgba(0,0,30,.45)]" style={{ opacity: 0 }}>
            <p className="font-mono text-[18px] tracking-[0.2em] text-[#121212]/50">DEVIS N° 2026-091</p>
            <p className="mt-2 font-display text-[44px] font-extrabold tracking-[-0.02em]">Mme Garnier · salle de bain</p>
            {[
              ["Dépose de l'existant", "264 €"],
              ["Douche à l'italienne", "1 480 €"],
              ["Carrelage mural, 24 m²", "1 152 €"],
              ["Plomberie, évacuation", "690 €"],
            ].map(([a, b]) => (
              <div key={a} className="mt-5 flex justify-between border-b border-[#121212]/10 pb-4 text-[27px]">
                <span>{a}</span>
                <span className="font-semibold tabular-nums">{b}</span>
              </div>
            ))}
            <div className="mt-6 flex items-baseline justify-between">
              <span className="text-[28px] text-[#121212]/60">Total TTC</span>
              <span data-r="devis-total" className="font-display text-[60px] font-extrabold tabular-nums">
                0 €
              </span>
            </div>
            <div
              data-r="devis-bouton"
              data-valide="0"
              className="group mt-7 grid h-[104px] place-items-center rounded-[28px] text-[34px] font-bold text-white data-[valide='0']:bg-[#C96B4A] data-[valide='1']:bg-[#2F8F5B]"
            >
              <span className="group-data-[valide='1']:hidden">Valider le devis</span>
              <span className="hidden group-data-[valide='1']:inline">Devis validé ✓</span>
            </div>
            <span data-r="devis-onde" className="absolute bottom-[96px] left-1/2 -ml-[52px] h-[104px] w-[104px] rounded-full border-[5px] border-white" style={{ opacity: 0 }} />
            <span data-r="devis-doigt" className="absolute bottom-[96px] left-1/2 -ml-[52px] h-[104px] w-[104px] rounded-full bg-white/90 shadow-[0_16px_40px_rgba(0,0,0,.45)] ring-[3px] ring-[#121212]/10" style={{ opacity: 0 }} />
          </div>
        </div>
      </div>

      {/* 7. Les points qui se rejoignent */}
      <div data-r="plan-points" className={PLAN} style={{ background: TERRACOTTA, visibility: "hidden" }}>
        <div className="absolute left-1/2 top-1/2">
          <svg data-r="points-cercle-g" className="absolute -left-[300px] -top-[300px] overflow-visible" width="600" height="600" viewBox="0 0 600 600">
            <circle data-r="points-cercle" cx="300" cy="300" r="280" fill="none" stroke="#121212" strokeWidth="3" pathLength={1} strokeDasharray="1 1" strokeDashoffset="1" />
          </svg>
          {Array.from({ length: POINTS }, (_, i) => (
            <span key={i} data-r="point" className="absolute -ml-[28px] -mt-[28px] h-[56px] w-[56px] rounded-full bg-[#121212]" style={{ opacity: 0 }} />
          ))}
        </div>
        <p className="absolute bottom-[90px] left-0 right-0 text-center font-display text-[46px] font-extrabold tracking-[-0.02em] text-[#121212]">Tous vos chantiers. Un seul endroit.</p>
      </div>

      {/* 8. La fin */}
      <div data-r="plan-fin" className={PLAN} style={{ background: NUIT, visibility: "hidden" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-center gap-8">
            <svg width="190" height="190" viewBox="0 0 100 100">
              <path data-r="fin-arc" d={TRAIT_ARC} fill="none" stroke={TERRACOTTA} strokeWidth="16" strokeLinecap="round" strokeDasharray="161" strokeDashoffset="161" />
              <g data-r="fin-coeur" transform="translate(86,49.79) scale(0)">
                <path d={COEUR} fill="#E8C5B6" />
              </g>
            </svg>
            <span data-r="fin-mot" className="font-display text-[190px] font-extrabold leading-none tracking-[-0.05em] text-white" style={{ opacity: 0 }}>
              Compyo
            </span>
          </div>
          <span data-r="fin-url" className="mt-14 rounded-full px-14 py-5 font-display text-[54px] font-extrabold text-white" style={{ background: TERRACOTTA, opacity: 0 } as CSSProperties}>
            compyo.fr
          </span>
        </div>
      </div>
    </div>
  );
}
