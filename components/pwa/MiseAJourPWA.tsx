"use client";

import { useEffect, useState } from "react";
import { BOUTON_PLEIN } from "@/components/ui/recettes";

// ============================================================
// Bandeau discret "Une nouvelle version de Compyo est disponible", prévenu
// par EnregistrerServiceWorker.tsx via l'événement "compyo:sw-maj-disponible"
// (voir ce fichier pour le détail du cycle de vie du service worker).
//
// Règle centrale demandée : NE JAMAIS casser la session en cours. On
// n'active donc jamais automatiquement le nouveau service worker — un
// artisan qui serait en train de remplir un devis ne doit jamais se le
// faire recharger sous les pieds. L'activation (skipWaiting côté worker,
// via postMessage) et le rechargement de page n'ont lieu qu'après un
// clic explicite sur "Mettre à jour".
// ============================================================

export function MiseAJourPWA() {
  const [enregistrement, setEnregistrement] = useState<ServiceWorkerRegistration | null>(null);
  const [miseAJourEnCours, setMiseAJourEnCours] = useState(false);

  useEffect(() => {
    function gererDisponibilite(e: Event) {
      const detail = (e as CustomEvent<ServiceWorkerRegistration>).detail;
      setEnregistrement(detail);
    }
    window.addEventListener("compyo:sw-maj-disponible", gererDisponibilite);
    return () => window.removeEventListener("compyo:sw-maj-disponible", gererDisponibilite);
  }, []);

  function mettreAJour() {
    if (!enregistrement?.waiting) return;
    setMiseAJourEnCours(true);
    // Prévient EnregistrerServiceWorker que CE changement de contrôleur est
    // voulu : c'est le seul cas où il recharge la page.
    window.dispatchEvent(new Event("compyo:sw-maj-acceptee"));
    // Le rechargement effectif est déclenché par le "controllerchange"
    // écouté dans EnregistrerServiceWorker.tsx, une fois que ce nouveau
    // worker a réellement pris le contrôle de la page — pas ici en dur,
    // pour ne jamais recharger avant que la bascule soit effective.
    enregistrement.waiting.postMessage("COMPYO_ACTIVER_NOUVELLE_VERSION");
  }

  if (!enregistrement?.waiting) return null;

  return (
    <div className="pwa-carte-entree fixed inset-x-4 top-4 z-50 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[26rem] [top:calc(1rem+env(safe-area-inset-top))]">
      {/* Design v3 (24/10) : une carte (surface, ombre des feuilles, sans
          contour ni émoji), le texte en 15 px, un vrai bouton de 48 px. */}
      <div className="flex items-center gap-3 rounded-[20px] bg-surface py-2 pl-4 pr-2 ombre-feuille">
        <p className="min-w-0 flex-1 text-[15px] leading-snug text-ink">
          Une nouvelle version de Compyo est disponible.
        </p>
        <button
          type="button"
          onClick={mettreAJour}
          disabled={miseAJourEnCours}
          className={`shrink-0 !px-4 text-[15px] ${BOUTON_PLEIN}`}
        >
          {miseAJourEnCours ? "Mise à jour…" : "Mettre à jour"}
        </button>
      </div>
    </div>
  );
}
