"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ============================================================
// « Une journée avec Compyo » (24/09) — le fil conducteur de l'accueil.
//
// Six scènes, de 07:48 à 18:40. Ce composant ne dessine aucune scène : il
// les met en mouvement.
//   - Une scène joue quand elle arrive à l'écran ([data-actif] posé une
//     fois, et l'évènement "v-joue" pour les scènes interactives).
//   - Le bouton « Rejouer » d'une scène la relance.
//   - L'horloge suit la lecture : sur grand écran (1280 px et plus), une
//     colonne collante à gauche ; en dessous, une barre fine sous
//     l'en-tête — à 1024 px, la colonne serrait trop les scènes. Ses aiguilles
//     tournent jusqu'à l'heure du chapitre en cours.
//
// Les scènes elles-mêmes restent rendues côté serveur (sauf les trois qui
// se manipulent) : le texte est dans le HTML, lisible sans JavaScript et
// par les moteurs de recherche.
// ============================================================

export type Chapitre = { heure: string; titre: string };

function minutes(heure: string) {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + m;
}

/** Un cadran à deux aiguilles. Les angles ne sont pas ramenés à un tour :
 *  de 07:48 à 10:15, la grande aiguille fait vraiment ses deux tours et
 *  demi, en avant, comme le temps qui passe — jamais en arrière. */
function Cadran({ heure, className = "" }: { heure: string; className?: string }) {
  const total = minutes(heure);
  const angleMinutes = total * 6;
  const angleHeures = (total / 60) * 30;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="20"
          y1="3.8"
          x2="20"
          y2={i % 3 === 0 ? "6.6" : "5.4"}
          stroke="currentColor"
          strokeOpacity={i % 3 === 0 ? 0.6 : 0.3}
          strokeWidth="1.1"
          strokeLinecap="round"
          transform={`rotate(${i * 30} 20 20)`}
        />
      ))}
      <line
        x1="20"
        y1="20"
        x2="20"
        y2="10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transform: `rotate(${angleHeures}deg)`, transformOrigin: "20px 20px", transition: "transform 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <line
        x1="20"
        y1="20"
        x2="20"
        y2="6.5"
        stroke="rgb(var(--c-signal))"
        strokeWidth="1.4"
        strokeLinecap="round"
        style={{ transform: `rotate(${angleMinutes}deg)`, transformOrigin: "20px 20px", transition: "transform 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Journee({ chapitres, children }: { chapitres: Chapitre[]; children: ReactNode }) {
  const racine = useRef<HTMLDivElement>(null);
  const [pret, setPret] = useState(false);
  const [courant, setCourant] = useState(0);

  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    setPret(true);

    const jouer = (scene: Element) => {
      scene.setAttribute("data-actif", "");
      scene.dispatchEvent(new CustomEvent("v-joue"));
    };

    const scenes = [...el.querySelectorAll("[data-scene]")];
    const activation = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          jouer(e.target);
          activation.unobserve(e.target);
        }
      },
      { threshold: 0.3 }
    );
    scenes.forEach((s) => activation.observe(s));

    // Le chapitre en cours : celui qui traverse le milieu de l'écran.
    const blocs = [...el.querySelectorAll("[data-chapitre]")];
    const suivi = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) setCourant(Number(e.target.getAttribute("data-chapitre")));
        }
      },
      { rootMargin: "-45% 0px -54% 0px" }
    );
    blocs.forEach((b) => suivi.observe(b));

    const surClic = (e: MouseEvent) => {
      const bouton = (e.target as HTMLElement).closest("[data-rejouer]");
      const scene = bouton?.closest("[data-scene]");
      if (!scene) return;
      scene.removeAttribute("data-actif");
      // Forcer le navigateur à constater la suppression, sinon les
      // animations CSS ne repartent pas de zéro.
      void (scene as HTMLElement).offsetWidth;
      jouer(scene);
    };
    el.addEventListener("click", surClic);

    return () => {
      activation.disconnect();
      suivi.disconnect();
      el.removeEventListener("click", surClic);
    };
  }, []);

  const chapitre = chapitres[courant] ?? chapitres[0];

  return (
    <div ref={racine} data-pret={pret ? "" : undefined} className="relative">
      {/* Téléphone : la barre de l'heure, collée sous l'en-tête. */}
      <div className="sticky top-16 z-20 -mx-5 mb-4 border-b border-ink/10 bg-paper/85 px-5 py-2.5 backdrop-blur-md sm:-mx-8 sm:px-8 xl:hidden">
        <div className="flex items-center gap-3">
          <Cadran heure={chapitre.heure} className="h-7 w-7 shrink-0 text-ink" />
          <p className="min-w-0 flex-1 truncate text-[13px]">
            <span className="font-mono tabular-nums text-signal">{chapitre.heure}</span>
            <span className="mx-2 text-ink/25">·</span>
            <span className="text-ink/80">{chapitre.titre}</span>
          </p>
          <div aria-hidden className="flex gap-1 max-[359px]:hidden">
            {chapitres.map((c, i) => (
              <span
                key={c.heure}
                className={`h-1 w-3 rounded-full transition-colors duration-500 ${i <= courant ? "bg-signal" : "bg-ink/15"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-[14rem_minmax(0,1fr)] xl:gap-16 2xl:grid-cols-[15rem_minmax(0,1fr)] 2xl:gap-20">
        {/* Ordinateur : la colonne de l'heure, collante. */}
        <nav aria-label="Les heures de la journée" className="hidden xl:block">
          <div className="sticky top-28">
            <Cadran heure={chapitre.heure} className="h-16 w-16 text-ink" />
            <p className="mt-4 font-display text-4xl font-semibold tabular-nums tracking-tight text-ink">
              {chapitre.heure}
            </p>
            <div className="relative mt-8">
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full w-px origin-top bg-signal transition-transform duration-700 ease-out"
              style={{ transform: `scaleY(${(courant + 1) / chapitres.length})` }}
            />
            <ol className="space-y-3.5 border-l border-ink/10 pl-5">
              {chapitres.map((c, i) => (
                <li key={c.heure}>
                  <a
                    href={`#chapitre-${i + 1}`}
                    className={`block text-[13px] leading-snug transition-colors duration-500 hover:text-ink ${
                      i === courant ? "text-ink" : "text-ink/40"
                    }`}
                    aria-current={i === courant ? "step" : undefined}
                  >
                    <span className="font-mono tabular-nums">{c.heure}</span>
                    <span className="ml-2">{c.titre}</span>
                  </a>
                </li>
              ))}
            </ol>
            </div>
          </div>
        </nav>

        <div>{children}</div>
      </div>
    </div>
  );
}

/** Pour les scènes qui se manipulent : sait quand la scène joue (et
 *  chaque fois qu'on la rejoue), et si le visiteur a demandé moins de
 *  mouvement. */
export function useScene<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [tour, setTour] = useState(0);
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    setReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const scene = ref.current?.closest("[data-scene]");
    if (!scene) return;
    const surJoue = () => setTour((t) => t + 1);
    if (scene.hasAttribute("data-actif")) surJoue();
    scene.addEventListener("v-joue", surJoue);
    return () => scene.removeEventListener("v-joue", surJoue);
  }, []);

  return { ref, tour, actif: tour > 0, reduit };
}
