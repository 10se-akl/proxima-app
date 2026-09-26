"use client";

import { useEffect, useRef, useState } from "react";
import { useScene } from "../Journee";
import { Carte, Etiquette, euros } from "./outils";

// ============================================================
// 12:30 — le devis se construit, et le visiteur y touche.
//
// Ce que la scène doit faire comprendre sans une ligne d'explication :
// l'IA écrit les postes, mais les montants viennent d'un calcul réglé
// sur les prix de l'artisan. D'où les deux commandes : la durée (½
// journée, 1 journée, 3 jours — l'erreur typique qu'un artisan corrige)
// et son taux horaire. Tout se recalcule sous ses yeux.
//
// Une journée compte 8 h, comme dans l'app (lib/moteur-metier/
// tempsMainOeuvre.ts, HEURES_PAR_JOURNEE). La TVA est à 10 % : travaux
// dans un logement de plus de deux ans.
// ============================================================

const HEURES_PAR_JOURNEE = 8;
const TVA = 10;

const FOURNITURES = [
  { designation: "Siphon PVC Ø40 et raccords", quantite: "1 u", montant: 38 },
  { designation: "Flexibles d'alimentation inox", quantite: "2 u × 14,50 €", montant: 29 },
  { designation: "Reprise du fond du meuble bas", quantite: "forfait", montant: 65 },
];

const DUREES = [
  { valeur: 0.5, libelle: "½ journée" },
  { valeur: 1, libelle: "1 journée" },
  { valeur: 3, libelle: "3 jours" },
];

const centimes = (n: number) => Math.round(n * 100) / 100;

/** Un nombre qui glisse vers sa nouvelle valeur au lieu de sauter. */
function useGlisse(cible: number, depart = cible) {
  const [valeur, setValeur] = useState(depart);
  const actuelle = useRef(depart);
  useEffect(() => {
    const de = actuelle.current;
    if (de === cible) return;
    const debut = performance.now();
    let image = 0;
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / 650);
      const v = de + (cible - de) * (1 - Math.pow(1 - p, 3));
      actuelle.current = v;
      setValeur(v);
      if (p < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [cible]);
  return valeur;
}

export function SceneDevis() {
  const { ref, tour, reduit } = useScene<HTMLDivElement>();
  const [jours, setJours] = useState(0.5);
  const [taux, setTaux] = useState(55);
  // Combien de lignes sont écrites (0 → 4), pour l'entrée en scène.
  const [lignes, setLignes] = useState(4);

  useEffect(() => {
    if (tour === 0) return;
    if (reduit) {
      setLignes(4);
      return;
    }
    setLignes(0);
    const minuteurs = [0, 1, 2, 3].map((i) => window.setTimeout(() => setLignes(i + 1), 500 + i * 550));
    return () => minuteurs.forEach(window.clearTimeout);
  }, [tour, reduit]);

  const mainOeuvre = centimes(jours * HEURES_PAR_JOURNEE * taux);
  const montants = [...FOURNITURES.map((f) => f.montant), mainOeuvre];
  const ht = centimes(montants.slice(0, lignes).reduce((s, m) => s + m, 0));
  const tva = centimes((ht * TVA) / 100);
  const ttc = centimes(ht + tva);

  const htAffiche = useGlisse(ht);
  const ttcAffiche = useGlisse(ttc);

  return (
    <div ref={ref} className="grid gap-8 px-4 pb-20 pt-8 max-md:gap-5 max-md:pb-5 max-md:pt-4 sm:px-10 sm:pb-24 sm:pt-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
      {/* Le devis */}
      <Carte className="overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-ink/[0.07] px-5 py-4 max-md:py-3 sm:px-7 sm:py-5">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Devis · Mme Garnier</p>
            <p className="mt-0.5 font-mono text-[11px] text-steel max-md:hidden">D-2026-048 · fuite sous l&apos;évier</p>
          </div>
          <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[11px] font-medium text-ink/60">Brouillon</span>
        </div>

        <div className="hidden grid-cols-[minmax(0,1fr)_auto] gap-4 px-7 pt-4 sm:grid">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-signal">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
              <path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6L8 1Z" />
            </svg>
            Postes rédigés par l&apos;IA
          </p>
          <p className="text-right text-[11px] font-medium text-ink/55">Calculés avec vos prix</p>
        </div>

        <ul className="px-5 sm:px-7">
          {FOURNITURES.map((f, i) => (
            <li
              key={f.designation}
              className={`flex items-baseline justify-between gap-4 border-b border-ink/[0.06] py-3.5 transition-all duration-700 max-md:py-2 ${
                i < lignes ? "opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              <span className="min-w-0 text-[14px] leading-snug text-ink">
                {f.designation}
                <span className="mt-0.5 block font-mono text-[11px] text-steel max-md:hidden">{f.quantite}</span>
              </span>
              <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">{euros(f.montant)}</span>
            </li>
          ))}
          <li
            className={`flex items-baseline justify-between gap-4 py-3.5 transition-all duration-700 max-md:py-2 ${
              lignes >= 4 ? "opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <span className="min-w-0 text-[14px] leading-snug text-ink">
              Main-d&apos;œuvre
              <span className="mt-0.5 block font-mono text-[11px] text-steel">
                {jours === 0.5 ? "½ j" : `${jours} j`} × {HEURES_PAR_JOURNEE} h × {euros(taux)}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-signal/10 px-1.5 py-0.5 font-mono text-[13px] tabular-nums text-ink">
              {euros(mainOeuvre)}
            </span>
          </li>
        </ul>

        <dl className="space-y-1.5 border-t border-ink/[0.07] bg-paper-warm/50 px-5 py-4 text-[13px] max-md:py-3 sm:px-7">
          <div className="flex justify-between max-md:hidden">
            <dt className="text-steel">Total HT</dt>
            <dd className="font-mono tabular-nums text-ink">{euros(htAffiche)}</dd>
          </div>
          <div className="flex justify-between max-md:hidden">
            <dt className="text-steel">TVA {TVA} %</dt>
            <dd className="font-mono tabular-nums text-ink">{euros(centimes(ttcAffiche - htAffiche))}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-2 max-md:pt-0">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-steel">
              Total TTC<span className="block normal-case tracking-normal md:hidden">dont TVA {TVA} %</span>
            </dt>
            <dd className="font-display text-[1.7rem] font-semibold tabular-nums tracking-tight text-ink" aria-live="polite">
              {euros(ttcAffiche)}
            </dd>
          </div>
        </dl>
      </Carte>

      {/* Les commandes : c'est l'artisan qui décide */}
      <div>
        <Etiquette className="max-md:hidden">À vous de corriger</Etiquette>
        <fieldset className="mt-4 max-md:mt-0">
          <legend className="text-[14px] font-medium text-ink">Durée du chantier</legend>
          <div className="mt-2.5 max-md:mt-1.5 grid grid-cols-3 gap-1 rounded-full bg-ink/[0.06] p-1">
            {DUREES.map((option) => (
              <label
                key={option.valeur}
                className={`cursor-pointer rounded-full px-2 py-2 text-center text-[13px] font-medium transition-all duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal/60 ${
                  jours === option.valeur ? "bg-surface text-ink shadow-[var(--v-ombre-legere)]" : "text-ink/55 hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="duree-devis"
                  value={option.valeur}
                  checked={jours === option.valeur}
                  onChange={() => setJours(option.valeur)}
                  className="sr-only"
                />
                {option.libelle}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-7 max-md:mt-4">
          <div className="flex items-baseline justify-between">
            <label htmlFor="taux-devis" className="text-[14px] font-medium text-ink">
              Votre taux horaire
            </label>
            <span className="font-mono text-[14px] tabular-nums text-ink">{euros(taux)}</span>
          </div>
          {/* 27/09 — 44 px de haut pour le doigt (16 avant), marges négatives
              pour garder exactement la place d'avant dans la scène. */}
          <input
            id="taux-devis"
            type="range"
            min={40}
            max={80}
            step={1}
            value={taux}
            onChange={(e) => setTaux(Number(e.target.value))}
            className="-mb-3.5 -mt-0.5 h-11 w-full cursor-pointer accent-[rgb(var(--c-signal))]"
          />
          <div aria-hidden className="mt-1 flex justify-between font-mono text-[10px] text-steel">
            <span>40 €</span>
            <span>80 €</span>
          </div>
        </div>

        <p className="mt-8 max-w-sm text-[15px] leading-relaxed text-ink/70 max-md:hidden">
          <span className="font-medium text-ink">L&apos;IA écrit les lignes. Les prix, c&apos;est vous.</span>{" "}
          Une journée compte 8&nbsp;heures, pas 24 : le calcul le sait.
        </p>
      </div>
    </div>
  );
}
