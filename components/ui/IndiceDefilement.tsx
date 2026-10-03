"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// ============================================================
// « Il y a la suite plus bas » (03/10, demande du fondateur).
//
// Sur téléphone, rien ne disait qu'un écran continuait sous la barre du
// bas : beaucoup ne défilaient pas et croyaient avoir tout vu. Quand la
// page dépasse l'écran et qu'on est encore en haut, une pastille « Plus
// bas » apparaît juste au-dessus de la barre ; un appui fait défiler, et
// elle s'efface dès qu'on a commencé à descendre. Rien sur ordinateur.
// ============================================================

const MARGE_PX = 120;

export function IndiceDefilement() {
  const chemin = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const evaluer = () => {
      const reste = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      setVisible(window.scrollY < 40 && reste > MARGE_PX);
    };
    evaluer();
    // Le contenu arrive souvent après le premier rendu (requêtes, squelettes).
    const minuteur = setTimeout(evaluer, 800);
    const obs = new ResizeObserver(evaluer);
    obs.observe(document.body);
    window.addEventListener("scroll", evaluer, { passive: true });
    window.addEventListener("resize", evaluer);
    return () => {
      clearTimeout(minuteur);
      obs.disconnect();
      window.removeEventListener("scroll", evaluer);
      window.removeEventListener("resize", evaluer);
    };
  }, [chemin]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollBy({ top: Math.round(window.innerHeight * 0.6), behavior: reduit ? "auto" : "smooth" });
      }}
      aria-label="Voir la suite plus bas"
      className="fixed left-1/2 z-30 flex min-h-12 -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-paper shadow-lg motion-safe:animate-bounce sm:hidden [bottom:calc(var(--barre-bas,0px)+env(safe-area-inset-bottom)+0.75rem)]"
    >
      Plus bas
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
