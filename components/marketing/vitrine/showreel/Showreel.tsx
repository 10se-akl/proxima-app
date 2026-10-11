"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Film } from "./Film";
import { DUREE, rendre } from "./scenes";

// ============================================================
// Le film Compyo sur la vitrine (11/10, référence d'Axel : un montage de
// motion design, et « un fond qui se crée quand tu défiles »).
//
// La section est haute de plusieurs écrans ; l'ordinateur reste fixe au
// milieu et c'est le défilement qui fait avancer le film, plan par plan
// (grille, COMPYO, « Vos soirées à vous », le bilan qui compte, les
// messages qui se rangent, le devis validé, les chantiers réunis, le
// logo). On peut revenir en arrière, s'arrêter sur un plan.
//
// Avec « réduire les animations » : pas de défilement piloté, la section
// fait un écran et montre la fin du film.
// ============================================================

const FIN_FIXE = 15.6;

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
  const invite = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = section.current;
    const sc = scene.current;
    if (!el || !sc) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.immobile = "1";
      rendre(sc, FIN_FIXE);
      return;
    }
    let image = 0;
    let visible = false;
    const maj = () => {
      image = 0;
      const r = el.getBoundingClientRect();
      const course = r.height - window.innerHeight;
      const k = course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
      rendre(sc, k * DUREE * 0.999);
      if (barre.current) barre.current.style.transform = `scaleX(${k})`;
      if (invite.current) invite.current.style.opacity = String(Math.max(0, 1 - k / 0.06));
    };
    const demander = () => {
      if (visible && !image) image = requestAnimationFrame(maj);
    };
    const obs = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      demander();
    });
    obs.observe(el);
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    maj();
    return () => {
      cancelAnimationFrame(image);
      obs.disconnect();
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
    };
  }, []);

  return (
    <section
      ref={section}
      aria-label="Compyo en seize secondes"
      className="v-showreel relative h-[560vh] max-md:h-[420vh] data-[immobile='1']:h-auto"
    >
      <p className="sr-only">
        Un court film : une grille de plan, le nom Compyo, « Vos soirées à vous », un bilan du mois qui se remplit, des
        messages de clients qui se rangent en projets, un devis validé d&apos;un geste, tous les chantiers réunis en un
        seul endroit, et le logo Compyo.
      </p>
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center px-4 pt-16 sm:px-8">
        <div className="w-[min(1120px,92vw,calc((100svh-12rem)*1.55))]">
          <Portable>
            <EcranFilm scene={scene} />
          </Portable>
          <div className="mx-auto mt-8 flex max-w-md items-center gap-3 font-mono text-[11px] tabular-nums text-steel">
            <span>00:00</span>
            <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-ink/10">
              <span ref={barre} className="absolute inset-0 origin-left scale-x-0 rounded-full bg-signal" />
            </span>
            <span className="text-signal">00:16</span>
          </div>
          <p ref={invite} className="mt-4 text-center text-[14px] font-medium text-steel">
            Faites défiler : le film avance avec vous ↓
          </p>
        </div>
      </div>
    </section>
  );
}
