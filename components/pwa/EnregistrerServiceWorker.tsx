"use client";

import { useEffect } from "react";

// ============================================================
// Enregistre public/sw.js une seule fois au chargement de l'app, puis
// surveille l'apparition d'une nouvelle version. Composant strictement
// dédié à cette mécanique — la décision de PRÉVENIR l'artisan (toast +
// bouton "Mettre à jour") vit dans MiseAJourPWA.tsx, prévenu ici via un
// événement DOM simple (CustomEvent sur window) plutôt qu'un contexte
// React ou une librairie de state : la communication est à sens unique,
// rare (au plus une fois par déploiement), un event bus minimal suffit
// et reste trivial à lire dans un an.
//
// Désactivé en développement (NODE_ENV !== "production") : un service
// worker qui mettrait en cache du HTML/JS pendant que Next.js recompile
// à chaque sauvegarde de fichier (Fast Refresh) créerait des incohérences
// difficiles à diagnostiquer pour Axel en train de coder, sans aucun
// bénéfice puisque le dev tourne toujours avec un réseau local fiable.
// ============================================================

export function EnregistrerServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((enregistrement) => {
        // Cas 1 : un nouveau service worker est déjà en attente au moment
        // où cet onglet s'ouvre (mise à jour parue pendant que l'artisan
        // n'avait pas Compyo ouvert).
        if (enregistrement.waiting) {
          window.dispatchEvent(
            new CustomEvent("compyo:sw-maj-disponible", { detail: enregistrement })
          );
        }

        // Cas 2 : une mise à jour arrive pendant que l'artisan utilise
        // déjà l'app — on suit le cycle de vie du nouveau worker jusqu'à
        // "installed" (= prêt, en attente d'activation).
        enregistrement.addEventListener("updatefound", () => {
          const nouveauWorker = enregistrement.installing;
          if (!nouveauWorker) return;
          nouveauWorker.addEventListener("statechange", () => {
            if (nouveauWorker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(
                new CustomEvent("compyo:sw-maj-disponible", { detail: enregistrement })
              );
            }
          });
        });
      })
      .catch(() => {
        // Échec d'enregistrement (navigateur non compatible, contexte non
        // sécurisé...) : Compyo reste pleinement utilisable en site web
        // classique, aucune fonctionnalité ne dépend du service worker
        // pour fonctionner — on échoue donc silencieusement plutôt que
        // d'afficher une erreur pour une brique non bloquante.
      });

    // Une fois que l'artisan a validé la mise à jour (voir MiseAJourPWA),
    // le nouveau service worker prend le contrôle : on recharge la page
    // une seule fois à ce moment précis, jamais spontanément.
    //
    // 27/09 — Corrigé : « controllerchange » arrive AUSSI à la toute
    // première visite, quand le service worker qui vient de s'installer
    // prend le contrôle de la page (clients.claim() dans sw.js). La page
    // se rechargeait alors toute seule quelques secondes après l'arrivée
    // (lecture renvoyée en haut, candidature commencée effacée). On ne
    // recharge plus que si l'artisan a appuyé sur « Mettre à jour ».
    let majAcceptee = false;
    const surMajAcceptee = () => {
      majAcceptee = true;
    };
    window.addEventListener("compyo:sw-maj-acceptee", surMajAcceptee);
    let dejaRecharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!majAcceptee || dejaRecharge) return;
      dejaRecharge = true;
      window.location.reload();
    });

  }, []);

  return null;
}
