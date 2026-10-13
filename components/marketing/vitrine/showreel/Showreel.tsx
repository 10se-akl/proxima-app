"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Film } from "./Film";
import { DUREE, rendre } from "./scenes";

// ============================================================
// Le film Compyo sur la vitrine (11/10, référence d'Axel : un montage de
// motion design, et « un fond qui se crée quand tu défiles »).
//
// Les plans : la grille, COMPYO, « Vos soirées à vous », le bilan qui
// compte, les messages qui se rangent, le devis validé, les chantiers
// réunis, le logo.
//
// 13/10 (retour d'Axel : « il faut descendre pour que la vidéo se
// construise, on ne comprend pas forcément qu'il faut dérouler ») — le
// défilement ne pilote plus le film. Il se lance seul, une fois, quand
// il est bien à l'écran ; il se met en pause s'il sort de l'écran et
// reprend quand on y revient. Un bouton Pause · Lecture · Revoir, et le
// temps qui avance. La section ne fait plus qu'un écran.
//
// Avec « réduire les animations » : la fin du film, immobile ; « Revoir »
// le joue quand même, puisque c'est demandé.
// ============================================================

const FIN_FIXE = 15.6;
const FIN = DUREE * 0.999;

type Etat = "attente" | "lecture" | "pause" | "fini";

function mmss(t: number): string {
  const s = t >= FIN ? DUREE : Math.min(DUREE, Math.floor(t));
  return `00:${String(s).padStart(2, "0")}`;
}

function IconeLecture() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function IconePause() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function IconeRevoir() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  );
}

/** L'ordinateur portable qui porte l'écran. */
export function Portable({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <div className="rounded-[2.2%/3.5%] bg-[#0b0d12] p-[1.4%] shadow-[0_50px_120px_-30px_rgba(0,0,0,.8)] ring-1 ring-white/10">{children}</div>
      <div className="relative mx-[-6%] h-[1.6vmin] min-h-[10px] rounded-b-[18px] bg-gradient-to-b from-[#454a54] to-[#1b1e24]">
        <span className="absolute left-1/2 top-0 h-[35%] w-[14%] -translate-x-1/2 rounded-b-[8px] bg-[#2a2e36]" />
      </div>
    </div>
  );
}

/** L'écran : le film de 1600 × 1000, mis à l'échelle de sa boîte. */
export function EcranFilm({ scene }: { scene: RefObject<HTMLDivElement> }) {
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ajuster = () => {
      if (scene.current) scene.current.style.transform = `scale(${el.clientWidth / 1600})`;
    };
    ajuster();
    const obs = new ResizeObserver(ajuster);
    obs.observe(el);
    return () => obs.disconnect();
  }, [scene]);
  return (
    <div ref={boite} className="relative aspect-[16/10] w-full overflow-hidden rounded-[0.6%]">
      <div ref={scene} className="absolute left-0 top-0 origin-top-left">
        <Film />
      </div>
    </div>
  );
}

export function Showreel() {
  const section = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const barre = useRef<HTMLSpanElement>(null);
  const horloge = useRef<HTMLSpanElement>(null);
  const temps = useRef(0);
  const [etat, setEtat] = useState<Etat>("attente");
  const etatRef = useRef<Etat>("attente");
  // Une pause faite par le visiteur ne reprend jamais toute seule ; celle
  // qui vient de la sortie de l'écran, si.
  const pauseAuto = useRef(false);

  const changer = useCallback((e: Etat) => {
    etatRef.current = e;
    setEtat(e);
  }, []);

  const dessiner = useCallback((t: number) => {
    if (scene.current) rendre(scene.current, t);
    if (barre.current) barre.current.style.transform = `scaleX(${Math.min(1, t / DUREE)})`;
    if (horloge.current) horloge.current.textContent = mmss(t);
  }, []);

  // Au départ : le premier plan, ou la fin si l'artisan a demandé moins
  // d'animations.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      temps.current = FIN;
      if (scene.current) rendre(scene.current, FIN_FIXE);
      if (barre.current) barre.current.style.transform = "scaleX(1)";
      if (horloge.current) horloge.current.textContent = mmss(DUREE);
      changer("fini");
      return;
    }
    dessiner(0);
    const obs = new IntersectionObserver(
      ([e]) => {
        const bienVisible = e.isIntersecting && e.intersectionRatio >= 0.5;
        const etatActuel = etatRef.current;
        if (bienVisible && (etatActuel === "attente" || (etatActuel === "pause" && pauseAuto.current))) {
          pauseAuto.current = false;
          changer("lecture");
        } else if (!e.isIntersecting && etatActuel === "lecture") {
          pauseAuto.current = true;
          changer("pause");
        }
      },
      { threshold: [0, 0.5] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [changer, dessiner]);

  // La lecture : le temps avance avec l'horloge de l'écran.
  useEffect(() => {
    if (etat !== "lecture") return;
    let image = 0;
    let avant = performance.now();
    const pas = (maintenant: number) => {
      temps.current = Math.min(FIN, temps.current + (maintenant - avant) / 1000);
      avant = maintenant;
      dessiner(temps.current);
      if (temps.current >= FIN) {
        changer("fini");
        return;
      }
      image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [etat, changer, dessiner]);

  const surBouton = () => {
    pauseAuto.current = false;
    if (etat === "lecture") return changer("pause");
    if (etat === "fini") {
      temps.current = 0;
      dessiner(0);
    }
    changer("lecture");
  };

  const bouton =
    etat === "lecture"
      ? { libelle: "Pause", icone: <IconePause /> }
      : etat === "fini"
        ? { libelle: "Revoir", icone: <IconeRevoir /> }
        : { libelle: "Lecture", icone: <IconeLecture /> };

  return (
    <section ref={section} aria-label="Compyo en seize secondes" className="v-showreel relative px-4 pb-16 pt-24 sm:px-8 sm:pb-24 sm:pt-28">
      <p className="sr-only">
        Un court film : une grille de plan, le nom Compyo, « Vos soirées à vous », un bilan du mois qui se remplit, des
        messages de clients qui se rangent en projets, un devis validé d&apos;un geste, tous les chantiers réunis en un
        seul endroit, et le logo Compyo.
      </p>
      <div className="mx-auto w-[min(1120px,92vw,calc((100svh-10rem)*1.55))]">
        <Portable>
          <EcranFilm scene={scene} />
        </Portable>
        <div className="mx-auto mt-8 flex max-w-lg items-center gap-4">
          <button
            type="button"
            onClick={surBouton}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-ink ring-1 ring-inset ring-ink/25 transition-colors hover:bg-ink/5 active:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {bouton.icone}
            {bouton.libelle}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3 font-mono text-[11px] tabular-nums text-steel" aria-hidden>
            <span ref={horloge}>00:00</span>
            <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-ink/10">
              <span ref={barre} className="absolute inset-0 origin-left scale-x-0 rounded-full bg-signal" />
            </span>
            <span className="text-signal">00:16</span>
          </div>
        </div>
      </div>
    </section>
  );
}
