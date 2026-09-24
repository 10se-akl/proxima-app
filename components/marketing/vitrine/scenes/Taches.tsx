"use client";

import { useEffect, useRef, useState } from "react";
import { useScene } from "../Journee";
import { Carte, Coche, Etiquette } from "./outils";

// Les tâches du jour qui se terminent une à une — et que le visiteur peut
// cocher ou décocher lui-même.

const TACHES = [
  "Commander le siphon Ø40",
  "Confirmer mercredi 8 h à Mme Garnier",
  "Facturer l'acompte Garnier",
  "Relire la relance de la facture F-031",
];

export function Taches() {
  const { ref, tour, reduit } = useScene<HTMLDivElement>();
  const [faites, setFaites] = useState<boolean[]>(TACHES.map(() => true));
  const minuteurs = useRef<number[]>([]);

  useEffect(() => {
    if (tour === 0) return;
    minuteurs.current.forEach(window.clearTimeout);
    if (reduit) {
      setFaites(TACHES.map(() => true));
      return;
    }
    setFaites(TACHES.map(() => false));
    minuteurs.current = TACHES.map((_, i) =>
      window.setTimeout(() => setFaites((f) => f.map((v, j) => (j === i ? true : v))), 2600 + i * 700)
    );
    return () => minuteurs.current.forEach(window.clearTimeout);
  }, [tour, reduit]);

  const n = faites.filter(Boolean).length;
  const fini = n === TACHES.length;
  const circonference = 2 * Math.PI * 15;

  return (
    <div ref={ref}>
      <Carte className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Etiquette>Aujourd&apos;hui</Etiquette>
            <p className="mt-1.5 font-display text-lg font-semibold text-ink">
              {fini ? "Journée bouclée" : `${TACHES.length - n} tâche${TACHES.length - n > 1 ? "s" : ""} restante${TACHES.length - n > 1 ? "s" : ""}`}
            </p>
          </div>
          <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-ink/10" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              className={`transition-[stroke-dashoffset,color] duration-700 ${fini ? "text-succes" : "text-signal"}`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circonference}
              strokeDashoffset={circonference * (1 - n / TACHES.length)}
            />
          </svg>
        </div>
        <ul className="mt-4 space-y-1">
          {TACHES.map((t, i) => (
            <li key={t}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-ink/[0.03] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal/60">
                <input
                  type="checkbox"
                  checked={faites[i]}
                  onChange={() => setFaites((f) => f.map((v, j) => (j === i ? !v : v)))}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all duration-300 ${
                    faites[i] ? "border-succes bg-succes text-white" : "border-ink/25 text-transparent"
                  }`}
                >
                  <Coche className="h-3 w-3" />
                </span>
                {/* Une rature de texte plutôt qu'un trait posé dessus : elle
                    suit le retour à la ligne quand la tâche en fait deux. */}
                <span
                  className={`text-[14px] leading-snug line-through transition-colors duration-500 ${
                    faites[i] ? "text-ink/45 decoration-ink/45" : "text-ink decoration-transparent"
                  }`}
                >
                  {t}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className={`mt-3 font-mono text-[11px] text-steel transition-opacity duration-500 ${fini ? "opacity-100" : "opacity-0"}`}>
          18:52 · rien ne reste pour ce soir
        </p>
      </Carte>
    </div>
  );
}
