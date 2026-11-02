"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ============================================================
// Le site public prend les couleurs du carnet de chantier (02/11/2026).
// Le script de app/layout.tsx pose la marque « site-carnet » sur <html> au
// chargement ; ce composant la tient à jour quand on change de page sans
// recharger (du site vers l'application, ou l'inverse). Les couleurs et
// les polices sont dans app/globals.css (bloc « Site carnet »).
// ============================================================

export function estPageDuSite(chemin: string): boolean {
  return !(
    chemin.startsWith("/dashboard") ||
    chemin.startsWith("/admin") ||
    chemin.startsWith("/devis/") ||
    chemin.startsWith("/apercu")
  );
}

export function ThemeSite() {
  const chemin = usePathname();
  useEffect(() => {
    if (!chemin) return;
    const site = estPageDuSite(chemin);
    document.documentElement.classList.toggle("site-carnet", site);
    if (site) {
      // Le site est clair par défaut ; l'ardoise seulement si on l'a
      // choisie (« 1 »). Un « dark » venu de l'application qui suit le
      // téléphone ne doit pas la déclencher.
      let sombre = false;
      try {
        sombre = localStorage.getItem("compyo-mode-sombre") === "1";
      } catch {}
      document.documentElement.classList.toggle("dark", sombre);
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", sombre ? "#1B2023" : "#F3F2ED"));
    }
  }, [chemin]);
  return null;
}
