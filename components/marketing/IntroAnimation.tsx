"use client";

import { useEffect, useState } from "react";

// Petite animation d'entrée sur la landing page — inspirée d'une vidéo
// montrée par Axel (intro 3D d'un site de studio créatif). Volontairement
// réduite à du SVG/CSS pur plutôt qu'une vraie scène 3D (Three.js) : cette
// dernière demanderait une librairie qu'on ne peut pas installer/tester
// dans cet environnement de développement, et surtout serait disproportionnée
// pour un visiteur qui découvre Compyo une fois, potentiellement sur un
// mobile avec un réseau faible — voir la discussion avec Axel.
//
// Le symbole se dessine trait par trait (l'arc, puis le cœur), comme une
// signature qu'on trace, avant de laisser place au site. Volontairement
// courte (~1,6s) et jouée UNE SEULE FOIS par visite (sessionStorage) : une
// intro qu'on revoit à chaque page vue devient vite un obstacle, pas un
// plaisir — c'est justement le piège identifié avant de se lancer.
const CLE_SESSION = "compyo-intro-vue";
const TRACE_COEUR =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

export function IntroAnimation() {
  // "null" = pas encore décidé (on attend le premier effet pour lire
  // sessionStorage/prefers-reduced-motion, uniquement possible côté
  // client — éviter tout flash ou mismatch d'hydratation).
  const [etat, setEtat] = useState<"attente" | "jouee" | "invisible">("invisible");

  useEffect(() => {
    const reduitDejaVue =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      sessionStorage.getItem(CLE_SESSION) === "1";

    if (reduitDejaVue) {
      sessionStorage.setItem(CLE_SESSION, "1");
      return;
    }

    setEtat("attente");
    sessionStorage.setItem(CLE_SESSION, "1");

    // Durée totale de la séquence (dessin de l'arc + apparition du cœur)
    // avant de lancer le fondu de sortie, qui dure lui-même 500ms de plus
    // (voir la transition CSS sur le conteneur).
    const timer = setTimeout(() => setEtat("jouee"), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (etat === "invisible") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-paper transition-opacity duration-500 ease-out ${
        etat === "jouee" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <svg viewBox="0 0 100 100" width={96} height={96} role="presentation">
        <path
          d="M 74.04 74.04 A 34 34 0 1 1 74.04 25.96"
          fill="none"
          stroke="#C96B4A"
          strokeWidth={16}
          strokeLinecap="round"
          pathLength={100}
          className="intro-trace-arc"
        />
        <g transform="translate(71.6,35.39) scale(1.2)" className="intro-trace-coeur">
          <path d={TRACE_COEUR} fill="#E8C5B6" />
        </g>
      </svg>
    </div>
  );
}
