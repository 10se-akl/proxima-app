"use client";

import { useEffect, useRef } from "react";

// Léger effet de profondeur (tilt 3D discret) au mouvement de souris, façon
// Linear/Vercel — implémenté en manipulant le style directement via une ref
// plutôt qu'un state React, pour ne pas déclencher un re-render à chaque
// pixel de déplacement de la souris (un mousemove peut tirer des dizaines
// d'événements par seconde). Extrait de components/marketing/LandingPage.tsx
// (où il servait pour la maquette du Hero) pour être réutilisé ailleurs dans
// l'app — voir components/dashboard/ConseilsCompagnon.tsx.
//
// `selecteurZone` (optionnel) : sélecteur CSS de l'ancêtre sur lequel écouter
// le mouvement (ex. "section") pour réagir même quand le curseur n'est pas
// exactement sur l'élément — utile pour une grande maquette dans une section
// large. Sans lui, l'écoute se fait directement sur l'élément (comportement
// par défaut, adapté à une petite carte autonome comme un panneau de conseils).
export function useParallaxSouris<T extends HTMLElement>(
  intensite = 6,
  selecteurZone?: string
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const noeud = ref.current;
    if (!noeud) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const zoneEcoute = (selecteurZone ? noeud.closest(selecteurZone) : null) ?? noeud;

    function onMove(e: Event) {
      const evt = e as MouseEvent;
      const rect = zoneEcoute.getBoundingClientRect();
      const x = (evt.clientX - rect.left) / rect.width - 0.5;
      const y = (evt.clientY - rect.top) / rect.height - 0.5;
      if (noeud) {
        noeud.style.transform = `perspective(1000px) rotateX(${(-y * intensite).toFixed(2)}deg) rotateY(${(x * intensite).toFixed(2)}deg)`;
      }
    }
    function onLeave() {
      if (noeud) noeud.style.transform = "";
    }

    zoneEcoute.addEventListener("mousemove", onMove);
    zoneEcoute.addEventListener("mouseleave", onLeave);
    return () => {
      zoneEcoute.removeEventListener("mousemove", onMove);
      zoneEcoute.removeEventListener("mouseleave", onLeave);
    };
  }, [intensite, selecteurZone]);

  return ref;
}
