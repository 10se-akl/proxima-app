"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Refonte (02/10) — duel C, lot 1. L'accueil se calcule côté serveur à
// l'ouverture. Installé en application, Compyo reste ouvert en arrière-plan
// toute la journée : Gérard qui le rouvre à 18 h voyait l'accueil de 8 h
// (« Maintenant » sur un rendez-vous passé, rien dans « À confirmer »).
// Au retour après plus de cinq minutes d'absence, on recalcule. Rien n'est
// rechargé pendant qu'on regarde l'écran, donc aucune saisie n'est perdue
// (l'accueil n'en a pas, à part les feuilles qui gardent leur état client).
// ============================================================
const ABSENCE_MIN_MS = 5 * 60 * 1000;

export function RafraichirAuRetour() {
  const router = useRouter();

  useEffect(() => {
    let cacheLe = document.visibilityState === "hidden" ? Date.now() : 0;
    const surVisibilite = () => {
      if (document.visibilityState === "hidden") {
        cacheLe = Date.now();
      } else if (cacheLe && Date.now() - cacheLe > ABSENCE_MIN_MS) {
        cacheLe = 0;
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", surVisibilite);
    return () => document.removeEventListener("visibilitychange", surVisibilite);
  }, [router]);

  return null;
}
