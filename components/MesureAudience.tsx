"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// ============================================================
// Mesure d'audience maison (Module 44, 22/09) — signale chaque page vue à
// /api/visite, qui n'en garde rien de personnel (voir cette route).
//
// Envoyé par sendBeacon : le navigateur l'expédie en arrière-plan, même si
// l'on quitte la page, sans jamais retarder l'affichage.
//
// Rien n'est envoyé :
//   - depuis un appareil marqué « ne pas compter » (bouton de la page
//     /admin/statistiques — pour qu'Axel ne compte pas ses propres tests) ;
//   - si le navigateur demande à ne pas être suivi (Global Privacy Control
//     ou Do Not Track) : c'est une demande explicite, on la respecte ;
//   - sur les pages d'administration.
// ============================================================

export const CLE_NE_PAS_MESURER = "compyo-ne-pas-mesurer";

// Le site d'origine ne compte qu'à l'arrivée : ensuite, chaque changement
// de page est une navigation interne, pas une nouvelle provenance.
let premiereVueEnvoyee = false;

export function MesureAudience() {
  const chemin = usePathname();
  const dernier = useRef<string | null>(null);

  useEffect(() => {
    if (!chemin || chemin === dernier.current) return;
    dernier.current = chemin;
    if (chemin.startsWith("/admin")) return;

    try {
      if (window.localStorage.getItem(CLE_NE_PAS_MESURER) === "1") return;
    } catch {
      // Stockage indisponible (navigation privée stricte) : on mesure.
    }
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl === true || nav.doNotTrack === "1") return;

    const params = new URLSearchParams(window.location.search);
    const corps = JSON.stringify({
      chemin,
      referent: premiereVueEnvoyee ? "" : document.referrer,
      source: params.get("utm_source") ?? "",
      tactile: navigator.maxTouchPoints > 1,
    });
    premiereVueEnvoyee = true;

    try {
      const parti = navigator.sendBeacon?.("/api/visite", new Blob([corps], { type: "application/json" }));
      if (!parti) {
        void fetch("/api/visite", {
          method: "POST",
          body: corps,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Jamais d'erreur visible pour une mesure d'audience.
    }
  }, [chemin]);

  return null;
}
