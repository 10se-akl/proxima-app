"use client";

import { useEffect, useState } from "react";

const CLE_STOCKAGE = "compyo-mode-sombre";

// Vrai mode sombre (palette de couleurs différente, voir globals.css et
// tailwind.config.ts) — à ne pas confondre avec l'ancien "Atténuer la
// luminosité" du dashboard (components/dashboard/ModeNuitToggle.tsx), qui
// reste un voile semi-transparent indépendant, gardé tel quel pour ceux
// qui veulent assombrir encore davantage même en mode sombre. Composant
// partagé entre le site vitrine (Header) et l'app (Sidebar) : un seul
// endroit à maintenir, une seule préférence, cohérente partout.
export function ThemeToggle({ className }: { className?: string }) {
  const [actif, setActif] = useState(false);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    // Le script anti-flash dans app/layout.tsx a déjà appliqué la classe
    // .dark avant ce rendu si besoin — on lit juste le même état ici pour
    // que le bouton affiche la bonne icône dès le départ.
    setActif(document.documentElement.classList.contains("dark"));
    setPret(true);
  }, []);

  function basculer() {
    const nouveau = !actif;
    setActif(nouveau);
    document.documentElement.classList.toggle("dark", nouveau);
    localStorage.setItem(CLE_STOCKAGE, nouveau ? "1" : "0");
  }

  // Évite un flash "mauvais état" avant que la préférence sauvegardée soit lue.
  if (!pret) {
    return <span className={className} aria-hidden style={{ visibility: "hidden" }}>🌙</span>;
  }

  return (
    <button
      onClick={basculer}
      aria-label={actif ? "Passer en mode clair" : "Passer en mode sombre"}
      title={actif ? "Mode clair" : "Mode sombre"}
      className={className ?? "text-ink/60 hover:text-ink transition-colors"}
    >
      {actif ? "☀️" : "🌙"}
    </button>
  );
}
