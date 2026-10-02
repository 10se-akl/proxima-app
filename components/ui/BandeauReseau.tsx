"use client";

import { useEffect, useState } from "react";

// ============================================================
// Refonte (02/10) — règle 14 de docs/langage-interface.md : « Hors
// ligne : le dire, ne rien promettre ».
//
// Une ligne, dans le flux (jamais en fixed : elle ne doit décaler ni la
// barre du bas ni les boutons collants), qui n'apparaît que sur
// l'événement « offline » — pas sur la valeur initiale de
// navigator.onLine, qui se trompe souvent en 4G faible. Elle ne promet
// rien : aucune écriture n'est mise en file d'attente (public/sw.js),
// c'est l'erreur sur la ligne touchée qui fait foi.
// ============================================================
export function BandeauReseau() {
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    const couper = () => setHorsLigne(true);
    const retablir = () => setHorsLigne(false);
    window.addEventListener("offline", couper);
    window.addEventListener("online", retablir);
    return () => {
      window.removeEventListener("offline", couper);
      window.removeEventListener("online", retablir);
    };
  }, []);

  return (
    <div aria-live="polite">
      {horsLigne && (
        <p className="flex min-h-10 items-center gap-2 bg-paper-warm px-4 text-sm font-semibold text-ink">
          <span className="h-2 w-2 shrink-0 rounded-full bg-alerte-orange" aria-hidden="true" />
          Pas de réseau.
        </p>
      )}
    </div>
  );
}
