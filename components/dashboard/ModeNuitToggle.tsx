"use client";

import { useEffect, useState } from "react";

const CLE_STOCKAGE = "proxima-mode-nuit";

// Pas un vrai mode sombre (voir globals.css) — juste un voile qui assombrit
// l'écran, pour travailler discrètement sans réveiller personne. Préférence
// purement locale à l'appareil : aucun intérêt à la synchroniser en base,
// donc simple localStorage, zéro appel réseau.
export function ModeNuitToggle({ className }: { className?: string }) {
  const [actif, setActif] = useState(false);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    const sauvegarde = localStorage.getItem(CLE_STOCKAGE) === "1";
    setActif(sauvegarde);
    document.documentElement.classList.toggle("mode-nuit", sauvegarde);
    setPret(true);
  }, []);

  function basculer() {
    const nouveau = !actif;
    setActif(nouveau);
    document.documentElement.classList.toggle("mode-nuit", nouveau);
    localStorage.setItem(CLE_STOCKAGE, nouveau ? "1" : "0");
  }

  // Évite un flash "mauvais état" avant que la préférence sauvegardée soit lue.
  if (!pret) return null;

  return (
    <button onClick={basculer} className={className ?? "text-xs text-paper/60 hover:text-paper underline"}>
      {actif ? "☀️ Désactiver l'atténuation" : "🌙 Atténuer la luminosité"}
    </button>
  );
}
