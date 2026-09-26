"use client";

import { useEffect, useState } from "react";

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
      <div className="rounded-2xl border border-ink/10 bg-surface shadow-lg shadow-ink/10 px-4 py-3 flex items-center gap-3">
        <span className="text-lg shrink-0" aria-hidden="true">
          ✨
        </span>
        <p className="text-sm text-ink flex-1 min-w-0">
          Une nouvelle version de Compyo est disponible.
        </p>
        <button
          onClick={mettreAJour}
          disabled={miseAJourEnCours}
          className="shrink-0 text-xs font-medium bg-ink text-paper rounded-lg px-3.5 py-2 transition-colors hover:bg-signal disabled:opacity-60"
        >
          {miseAJourEnCours ? "Mise à jour…" : "Mettre à jour"}
        </button>
      </div>
    </div>
  );
}
