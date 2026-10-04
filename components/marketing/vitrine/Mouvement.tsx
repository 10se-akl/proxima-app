"use client";

import { useEffect, useRef } from "react";

// ============================================================
// Le mouvement au défilement de la vitrine (04/10, demande d'Axel : « il y
// a juste un fond noir, c'est vraiment un truc à améliorer »).
//
//   - FondVivant : derrière toute la page, trois halos de lumière qui
//     glissent et changent de couleur à mesure qu'on descend, de la
//     poussière de lumière qui monte à deux vitesses, un quadrillage de
//     plan d'architecte qui défile moins vite que la page, et un grain
//     fin. En haut de l'écran, un filet terracotta dit où l'on en est.
//   - BandeMots : une bande de mots géants (Devis · Factures · …) qui
//     glisse de côté pendant qu'on défile, la typographie de la pub.
//
// Les règles de vitrine.css tiennent : on n'anime que transform et
// opacity, une seule mise à jour par image (requestAnimationFrame), rien
// ne bouge avec « réduire les animations », et sans JavaScript tout est
// simplement immobile.
// ============================================================

function reduit() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function FondVivant() {
  const fond = useRef<HTMLDivElement>(null);
  const filet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let image = 0;
    const maj = () => {
      image = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fond.current?.style.setProperty("--v-p", p.toFixed(4));
      filet.current?.style.setProperty("--v-p", p.toFixed(4));
    };
    const surDefile = () => {
      if (!image) image = requestAnimationFrame(maj);
    };
    maj();
    window.addEventListener("scroll", surDefile, { passive: true });
    window.addEventListener("resize", surDefile);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("scroll", surDefile);
      window.removeEventListener("resize", surDefile);
    };
  }, []);

  return (
    <>
      <div ref={fond} aria-hidden className="v-fond-vivant">
        <span className="v-tache v-tache-a" />
        <span className="v-tache v-tache-b" />
        <span className="v-tache v-tache-c" />
        <span className="v-poussiere v-poussiere-a" />
        <span className="v-poussiere v-poussiere-b" />
        <span className="v-plan" />
        <span className="v-fond-grain" />
      </div>
      <div ref={filet} aria-hidden className="v-progression" />
    </>
  );
}

export function BandeMots({ mots, sens = 1 }: { mots: string[]; sens?: 1 | -1 }) {
  const bande = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bande.current;
    if (!el || reduit()) return;
    let image = 0;
    let visible = false;
    // 0 quand la bande entre par le bas de l'écran, 1 quand elle sort par
    // le haut.
    const maj = () => {
      image = 0;
      const r = el.getBoundingClientRect();
      const p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
      el.style.setProperty("--v-bande", Math.min(1, Math.max(0, p)).toFixed(4));
    };
    const surDefile = () => {
      if (visible && !image) image = requestAnimationFrame(maj);
    };
    // Hors de l'écran, la bande ne calcule rien.
    const obs = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      surDefile();
    });
    obs.observe(el);
    window.addEventListener("scroll", surDefile, { passive: true });
    maj();
    return () => {
      cancelAnimationFrame(image);
      obs.disconnect();
      window.removeEventListener("scroll", surDefile);
    };
  }, []);

  // Trois fois la suite : la bande reste pleine d'un bord à l'autre,
  // quelle que soit la largeur de l'écran.
  const suite = [...mots, ...mots, ...mots];
  return (
    <div ref={bande} aria-hidden className="v-bande" style={{ "--v-sens": sens } as React.CSSProperties}>
      <div className="v-bande-piste font-display">
        {suite.map((m, i) => (
          <span key={i} className={i % 2 ? "v-bande-creux" : "v-bande-plein"}>
            {m}
            <i className="v-bande-point" />
          </span>
        ))}
      </div>
    </div>
  );
}
