"use client";

import { useEffect, useState } from "react";

// ============================================================
// Le fond animé du hero (20/09) — une boucle de 8 secondes produite par
// compyo/rendu-fond-hero.py (44 Ko).
//
// Rendu comme un panneau encadré, pas comme un papier peint : il est posé
// dans un cadre à grands arrondis, à faible opacité, et le texte passe
// au-dessus en z-10. C'est la différence entre "il y a une image derrière
// le texte" et "le texte est posé sur quelque chose".
//
// Deux précautions :
//   - la vidéo n'est montée qu'après l'affichage, et seulement si le
//     visiteur n'a pas demandé moins de mouvement. Sur un téléphone
//     d'entrée de gamme, le fond n'est jamais le premier téléchargement ;
//   - sans elle, le dégradé statique en dessous reste visible. Rien ne
//     saute, rien ne manque.
// ============================================================

export function FondHero() {
  const [anime, setAnime] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Après la première peinture : le fond ne doit jamais retarder le
    // titre, qui est la seule chose importante de cet écran.
    const t = window.setTimeout(() => setAnime(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  if (!anime) return null;

  return (
    <video
      src="/hero-fond.mp4"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      tabIndex={-1}
      className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-1000 dark:opacity-25"
    />
  );
}
