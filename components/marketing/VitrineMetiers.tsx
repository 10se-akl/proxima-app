"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  EXEMPLES_METIERS,
  totalLigne,
  totaux,
  type ExempleMetier,
} from "@/components/marketing/metiers/exemplesMetiers";

// ============================================================
// Vitrine des métiers (18/09) — la « carte » de Compyo.
//
// Comme la carte d'un restaurant : une rangée de cartes, une par métier,
// chacune avec son « plat » — un chantier type et son prix. On en choisit
// une, et la scène montre ce que Compyo fait vraiment pour ce métier :
//   1. le chantier, avec ses cotes en marge ;
//   2. le devis qui se remplit, ligne par ligne, jusqu'au total ;
//   3. les questions que l'app pose AVANT de chiffrer — les vraies,
//      tirées de lib/checklistsMetier.ts.
//
// La rangée avance toute seule (barre de progression sous la carte à la
// une) tant que le visiteur regarde sans toucher ; au premier geste, elle
// lui laisse la main pour de bon. Rien ne bouge chez qui a demandé à
// réduire les animations.
// ============================================================

export type IllustrationMetier = {
  id: string;
  accent: string;
  illustration: (accent: string) => ReactNode;
};

const DUREE_PAR_METIER_MS = 7000;

function euros(n: number, decimales = true) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimales ? 2 : 0,
    maximumFractionDigits: decimales ? 2 : 0,
  });
}

function quantite(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function useMouvementReduit() {
  const [reduit, setReduit] = useState(false);
  useEffect(() => {
    const requete = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduit(requete.matches);
    const surChangement = () => setReduit(requete.matches);
    requete.addEventListener("change", surChangement);
    return () => requete.removeEventListener("change", surChangement);
  }, []);
  return reduit;
}

// Un nombre qui monte de 0 à sa valeur, puis s'arrête net dessus.
function useCompteur(cible: number, cle: string, retardMs: number, actif: boolean) {
  const [valeur, setValeur] = useState(actif ? 0 : cible);
  useEffect(() => {
    if (!actif) {
      setValeur(cible);
      return;
    }
    setValeur(0);
    let image = 0;
    const debut = performance.now() + retardMs;
    const duree = 900;
    const pas = (maintenant: number) => {
      const p = Math.min(1, Math.max(0, (maintenant - debut) / duree));
      setValeur(p >= 1 ? cible : cible * (1 - Math.pow(1 - p, 3)));
      if (p < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    // Filet de sécurité : si le navigateur suspend les animations (onglet
    // en arrière-plan, économie d'énergie), le total arrive quand même à
    // sa vraie valeur — jamais un « 0,00 € » figé sur un devis.
    const secours = window.setTimeout(() => setValeur(cible), retardMs + duree + 250);
    return () => {
      cancelAnimationFrame(image);
      window.clearTimeout(secours);
    };
  }, [cible, cle, retardMs, actif]);
  return valeur;
}

export function VitrineMetiers({ illustrations }: { illustrations: IllustrationMetier[] }) {
  const mouvementReduit = useMouvementReduit();
  const [index, setIndex] = useState(0);
  // Le visiteur a pris la main : plus de défilement automatique.
  const [enMain, setEnMain] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [aLEcran, setALEcran] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const rangeeRef = useRef<HTMLDivElement>(null);

  const parId = useMemo(() => new Map(illustrations.map((i) => [i.id, i])), [illustrations]);
  const metiers = useMemo(() => EXEMPLES_METIERS.filter((m) => parId.has(m.id)), [parId]);
  const exemple = metiers[index] ?? metiers[0];
  const illustration = parId.get(exemple.id)!;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observateur = new IntersectionObserver(([e]) => setALEcran(e.isIntersecting), { threshold: 0.25 });
    observateur.observe(section);
    return () => observateur.disconnect();
  }, []);

  const defilementAuto = !enMain && !mouvementReduit;
  const enPause = survol || !aLEcran;

  // La carte à la une reste visible dans la rangée — défilement horizontal
  // uniquement : on ne fait jamais sauter la page.
  useEffect(() => {
    const rangee = rangeeRef.current;
    const carte = rangee?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!rangee || !carte) return;
    rangee.scrollTo({
      left: carte.offsetLeft - rangee.clientWidth / 2 + carte.clientWidth / 2,
      behavior: mouvementReduit ? "auto" : "smooth",
    });
  }, [index, mouvementReduit]);

  function choisir(i: number) {
    setEnMain(true);
    setIndex((i + metiers.length) % metiers.length);
  }

  function surTouche(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      choisir(index + 1);
      rangeeRef.current?.querySelector<HTMLElement>(`[data-index="${(index + 1) % metiers.length}"]`)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      choisir(index - 1);
      rangeeRef.current
        ?.querySelector<HTMLElement>(`[data-index="${(index - 1 + metiers.length) % metiers.length}"]`)
        ?.focus();
    }
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-32" aria-labelledby="titre-vitrine">
      {/* Halo de la couleur du métier à la une, qui suit la sélection. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-40 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-3xl transition-colors duration-1000"
        style={{ background: `radial-gradient(closest-side, ${illustration.accent}26, transparent)` }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#C96B4A]">Votre métier</p>
            <h2 id="titre-vitrine" className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-[#F5F1EA] sm:text-5xl">
              Choisissez votre métier.
              <br />
              <span className="text-[#E8956F]">On vous montre le devis.</span>
            </h2>
            <p className="mt-4 text-[#C9C0B4]">
              Un chantier type, les questions que Compyo vous pose avant de chiffrer, et le devis qui en
              sort.
            </p>
          </div>
          <div className="flex gap-2">
            <BoutonFleche sens="precedent" onClick={() => choisir(index - 1)} />
            <BoutonFleche sens="suivant" onClick={() => choisir(index + 1)} />
          </div>
        </div>
      </div>

      {/* La rangée de cartes — la « carte » du restaurant. */}
      <div
        ref={rangeeRef}
        role="tablist"
        aria-label="Métiers"
        onKeyDown={surTouche}
        onPointerDown={() => setEnMain(true)}
        className="rangee relative mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-6 pt-2 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
      >
        {metiers.map((m, i) => {
          const actif = i === index;
          const illu = parId.get(m.id)!;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              data-index={i}
              aria-selected={actif}
              aria-controls="scene-metier"
              tabIndex={actif ? 0 : -1}
              onClick={() => choisir(i)}
              className={`carte group relative w-[208px] shrink-0 snap-center overflow-hidden rounded-[1.6rem] border text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8956F] sm:w-[236px] ${
                actif ? "-translate-y-1.5 shadow-2xl shadow-black/40" : "opacity-75 hover:-translate-y-1 hover:opacity-100"
              }`}
              style={{
                borderColor: actif ? illu.accent : "rgba(255,255,255,0.08)",
                background: `radial-gradient(130% 85% at 50% 0%, ${illu.accent}${actif ? "40" : "22"}, #231B16 72%)`,
              }}
            >
              {actif && (
                <span className="absolute left-3 top-3 z-10 rounded-full bg-[#F5F1EA] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1B1512]">
                  À la une
                </span>
              )}
              <div className={`mx-auto mt-7 h-[132px] w-[132px] ${actif && !mouvementReduit ? "flotte" : ""}`}>
                {illu.illustration(illu.accent)}
              </div>
              <div className="p-4 pt-3">
                <p className="font-display text-xl font-semibold text-[#F5F1EA]">{m.nom}</p>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug text-[#C9C0B4]">{m.chantier}</p>
                <p
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] text-[#F5F1EA]"
                  style={{ backgroundColor: `${illu.accent}33` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: illu.accent }} />
                  {euros(totaux(m).ttc, false)} TTC
                </p>
              </div>
              {actif && defilementAuto && (
                <span
                  key={index}
                  aria-hidden
                  className="barre absolute bottom-0 left-0 h-[3px]"
                  style={{
                    backgroundColor: illu.accent,
                    animationDuration: `${DUREE_PAR_METIER_MS}ms`,
                    animationPlayState: enPause ? "paused" : "running",
                  }}
                  onAnimationEnd={() => setIndex((j) => (j + 1) % metiers.length)}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* La scène du métier choisi. */}
      <div className="relative mx-auto max-w-6xl px-6">
        <div
          id="scene-metier"
          role="tabpanel"
          aria-live="polite"
          onMouseEnter={() => setSurvol(true)}
          onMouseLeave={() => setSurvol(false)}
          className="mt-4 grid gap-5 rounded-[2rem] border border-white/10 bg-[#1E1713]/90 p-5 backdrop-blur-sm sm:p-8 lg:grid-cols-[1fr_1.25fr_1fr] lg:gap-8"
        >
          <Scene key={exemple.id} exemple={exemple} illustration={illustration} anime={!mouvementReduit} />
        </div>
      </div>

      {/* Tout le contenu, pour les lecteurs d'écran et les moteurs de recherche. */}
      <ul className="sr-only">
        {metiers.map((m) => (
          <li key={m.id}>
            {m.nom} — exemple : {m.chantier}, {euros(totaux(m).ttc)} TTC. Questions posées avant de chiffrer :{" "}
            {m.checklist.join(" ; ")}.
          </li>
        ))}
      </ul>

      <style jsx>{`
        .rangee {
          scrollbar-width: none;
          mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
        }
        .rangee::-webkit-scrollbar {
          display: none;
        }
        .flotte {
          animation: flotte 5s ease-in-out infinite;
        }
        .barre {
          width: 0;
          animation-name: remplir;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes flotte {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-6px) rotate(-2deg);
          }
        }
        @keyframes remplir {
          to {
            width: 100%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .flotte {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

function BoutonFleche({ sens, onClick }: { sens: "precedent" | "suivant"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={sens === "precedent" ? "Métier précédent" : "Métier suivant"}
      className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-[#E8DCCB] transition-all hover:scale-105 hover:border-white/35 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${sens === "precedent" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

// ----------------------------------------------------------------------------
// La scène : chantier, devis, questions. Remontée à chaque changement de
// métier (key), ce qui rejoue ses entrées.
// ----------------------------------------------------------------------------
function Scene({
  exemple,
  illustration,
  anime,
}: {
  exemple: ExempleMetier;
  illustration: IllustrationMetier;
  anime: boolean;
}) {
  const { ht, tva, ttc } = totaux(exemple);
  const delaiLignes = 140;
  const finLignes = 250 + exemple.lignes.length * delaiLignes;
  const totalAffiche = useCompteur(ttc, exemple.id, finLignes, anime);
  const accent = illustration.accent;

  return (
    <>
      {/* 1. Le chantier, avec ses cotes en marge. */}
      <div className={`flex flex-col ${anime ? "entree" : ""}`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#C9C0B4]/70">01 · Le chantier</p>
        <h3 className="mt-2 font-display text-2xl font-semibold leading-snug text-[#F5F1EA]">{exemple.chantier}</h3>
        <div className="relative mx-auto mt-6 h-56 w-full max-w-[18rem]">
          <div className="absolute inset-x-10 inset-y-6">{illustration.illustration(accent)}</div>
          <Cote position="haut" libelle={exemple.cotes[0].libelle} valeur={exemple.cotes[0].valeur} accent={accent} anime={anime} retard={250} />
          <Cote position="bas" libelle={exemple.cotes[1].libelle} valeur={exemple.cotes[1].valeur} accent={accent} anime={anime} retard={450} />
        </div>
      </div>

      {/* 2. Le devis, sur papier : c'est le document que reçoit le client. */}
      <div className={`rounded-2xl bg-[#FAF8F5] p-5 text-[#1F2937] shadow-2xl shadow-black/40 sm:p-6 ${anime ? "entree" : ""}`} style={{ animationDelay: "80ms" }}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#1F2937]/50">02 · Le devis</p>
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.12em] text-[#C96B4A]">Devis</p>
        </div>
        <ul className="mt-4 divide-y divide-[#1F2937]/10 border-y border-[#1F2937]/10">
          {exemple.lignes.map((l, i) => (
            <li
              key={l.designation}
              className={`flex items-start justify-between gap-3 py-2.5 ${anime ? "ligne" : ""}`}
              style={{ animationDelay: `${250 + i * delaiLignes}ms` }}
            >
              <div className="min-w-0">
                <p className="text-[13.5px] leading-snug">{l.designation}</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#1F2937]/50">
                  {quantite(l.quantite)} {l.unite} × {euros(l.prixUnitaire)}
                </p>
              </div>
              <p className="shrink-0 font-mono text-[13px] font-medium tabular-nums">{euros(totalLigne(l))}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 text-[13px] text-[#1F2937]/65">
          <div className="flex justify-between">
            <span>Total HT</span>
            <span className="font-mono tabular-nums">{euros(ht)}</span>
          </div>
          <div className="flex justify-between">
            <span>TVA {exemple.tvaPct.toLocaleString("fr-FR")} %</span>
            <span className="font-mono tabular-nums">{euros(tva)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between rounded-xl bg-[#1F2937] px-4 py-3 text-white">
          <span className="text-sm font-medium">Total TTC</span>
          <span className="font-display text-xl font-bold tabular-nums">{euros(totalAffiche)}</span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#1F2937]/50">
          Prix d&apos;exemple. Compyo chiffre avec vos tarifs, et vous validez chaque ligne avant l&apos;envoi.
        </p>
      </div>

      {/* 3. Les questions — les vraies, celles de l'app. */}
      <div className={`flex flex-col ${anime ? "entree" : ""}`} style={{ animationDelay: "160ms" }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#C9C0B4]/70">03 · Avant de chiffrer</p>
        <p className="mt-2 font-display text-lg font-semibold leading-snug text-[#F5F1EA]">
          Ce que Compyo vous demande de vérifier
        </p>
        <ul className="mt-5 space-y-3">
          {exemple.checklist.map((q, i) => (
            <li
              key={q}
              className={`flex items-start gap-3 text-[14px] leading-snug text-[#E8DCCB] ${anime ? "question" : ""}`}
              style={{ animationDelay: `${finLignes + 150 + i * 120}ms` }}
            >
              <span
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: `${accent}33`, color: accent }}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-6 text-[12px] leading-relaxed text-[#C9C0B4]/60">
          Ce sont les questions réellement posées dans l&apos;application, pour éviter de repasser sur
          le chantier pour une mesure oubliée.
        </p>
      </div>

      <style jsx>{`
        .entree {
          animation: entree 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }
        .ligne {
          animation: ligne 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }
        .question {
          animation: question 0.4s ease-out both;
        }
        @keyframes entree {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes ligne {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes question {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </>
  );
}

// Une cote en marge, comme sur un plan : un trait qui se trace vers
// l'illustration, puis la valeur.
function Cote({
  position,
  libelle,
  valeur,
  accent,
  anime,
  retard,
}: {
  position: "haut" | "bas";
  libelle: string;
  valeur: string;
  accent: string;
  anime: boolean;
  retard: number;
}) {
  const haut = position === "haut";
  return (
    <div
      className={`absolute flex items-center gap-2 ${haut ? "left-0 top-0" : "bottom-0 right-0 flex-row-reverse text-right"}`}
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C9C0B4]/70">{libelle}</p>
        <p className="font-mono text-lg font-medium text-[#F5F1EA]">{valeur}</p>
      </div>
      <span
        aria-hidden
        className={`h-px w-10 ${anime ? "trait" : ""}`}
        style={{ backgroundColor: accent, animationDelay: `${retard}ms`, transformOrigin: haut ? "left" : "right" }}
      />
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
      <style jsx>{`
        .trait {
          animation: trait 0.5s ease-out both;
        }
        @keyframes trait {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}
