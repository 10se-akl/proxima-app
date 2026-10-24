"use client";

import { useEffect } from "react";

// ============================================================
// Design v3 (23/10) — dans l'application, le thème suit le téléphone tant
// que l'artisan n'a rien choisi (ThemeToggle écrit « 1 » sombre, « 0 »
// clair). Le script de app/layout.tsx le fait au chargement d'une page ;
// ce composant le refait quand on ENTRE dans l'application sans recharger
// (connexion, lien depuis le site, qui est en sombre par défaut), et suit
// le réglage du téléphone s'il change (le soir, le mode sombre automatique).
// La barre d'état prend la couleur du fond affiché.
// ============================================================

const CLE = "compyo-mode-sombre";

function appliquer(sombre: boolean) {
  document.documentElement.classList.toggle("dark", sombre);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", sombre ? "#0E0F12" : "#F6F5F2"));
}

export function ThemeAppli() {
  useEffect(() => {
    let choix: string | null = null;
    try {
      choix = localStorage.getItem(CLE);
    } catch {
      return;
    }
    if (choix === "1" || choix === "0") {
      appliquer(choix === "1");
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    appliquer(media.matches);
    const suivre = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(CLE) === null) appliquer(e.matches);
      } catch {}
    };
    media.addEventListener("change", suivre);
    return () => media.removeEventListener("change", suivre);
  }, []);
  return null;
}
