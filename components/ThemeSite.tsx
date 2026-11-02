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
      // Le site est toujours clair : un reste de « dark » venu de
      // l'application garderait les variantes dark: de Tailwind.
      document.documentElement.classList.remove("dark");
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", "#F3F2ED"));
    }
  }, [chemin]);
  return null;
}
