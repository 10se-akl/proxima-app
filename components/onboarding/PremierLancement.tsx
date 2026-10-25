"use client";

import { useEffect, useState } from "react";
import { BOUTON_CREUX_LARGE, BOUTON_PLEIN_LARGE } from "@/components/ui/recettes";
import {
  declencherInstallation,
  demanderAffichageManuel,
  estDejaInstallee,
  estIOS,
  initialiserEcouteInstallation,
  marquerInstallationDejaProposee,
} from "@/lib/pwa/installPrompt";
import { tutoDejaVu } from "@/components/onboarding/TutoPremierProjet";
import { detecterPlateforme, installationBloqueeParAndroid } from "@/lib/pwa/plateforme";

// ============================================================
// Premier lancement — proposer d'installer Compyo sur le téléphone, une
// seule fois par navigateur (même convention que InstallPWA.tsx), jamais
// reproposé, même en cas de fermeture sans terminer.
//
// 08/10 (passe de finition) — il ne reste que cet écran. Avant, trois
// écrans le précédaient (« Bienvenue sur Compyo », « Recevez vos demandes
// comme d'habitude », « Un partage suffit »), avec des points de
// progression, « Passer » et « Suivant » et des emojis. Le mini-tuto
// (TutoPremierProjet), joué juste avant depuis le 03/10, fait déjà faire
// ce geste pour de vrai : l'artisan lisait deux fois la même chose avant
// d'arriver dans l'application.
// ============================================================

const CLE_ONBOARDING_VU = "compyo-onboarding-vu";

export function PremierLancement() {
  const [visible, setVisible] = useState(false);
  const [modeIOS, setModeIOS] = useState(false);
  const [ordinateur, setOrdinateur] = useState(false);
  const [bloqueAndroid, setBloqueAndroid] = useState(false);
  const [installationEnCours, setInstallationEnCours] = useState(false);

  useEffect(() => {
    initialiserEcouteInstallation();

    if (estDejaInstallee()) return;

    let dejaVu = false;
    try {
      dejaVu = window.localStorage.getItem(CLE_ONBOARDING_VU) === "1";
    } catch {
      // Stockage indisponible : tant pis, on ne bloque jamais l'accès à
      // l'app pour ça — l'écran ne s'affichera simplement pas.
    }

    if (!dejaVu) {
      const afficher = () => {
        setModeIOS(estIOS());
        setOrdinateur(detecterPlateforme() === "desktop");
        setBloqueAndroid(installationBloqueeParAndroid());
        setVisible(true);
      };
      // 03/10 — jamais par-dessus le mini-tuto : on attend sa fin.
      // 13/10 — et pas non plus par-dessus son premier vrai projet : si le
      // tuto se termine sur « À moi : mon premier projet », la question
      // attend la prochaine ouverture de l'application.
      const apresTuto = (e: Event) => {
        if ((e as CustomEvent<{ capture?: boolean }>).detail?.capture) return;
        afficher();
      };
      if (tutoDejaVu()) afficher();
      else {
        window.addEventListener("compyo:tuto-termine", apresTuto, { once: true });
        return () => window.removeEventListener("compyo:tuto-termine", apresTuto);
      }
    }
  }, []);

  function terminer() {
    setVisible(false);
    marquerInstallationDejaProposee();
    try {
      window.localStorage.setItem(CLE_ONBOARDING_VU, "1");
    } catch {
      // Sans conséquence grave si ça échoue : au pire, réapparaît une fois
      // de plus qu'idéal — jamais bloquant.
    }
  }

  async function installer() {
    if (modeIOS) {
      terminer();
      return;
    }
    setInstallationEnCours(true);
    const resultat = await declencherInstallation();
    setInstallationEnCours(false);
    terminer();
    // 20/09 — Si le navigateur n'avait rien à proposer, ce bouton venait
    // de ne RIEN faire aux yeux de l'artisan. La carte d'installation
    // prend le relais avec le chemin manuel propre à son navigateur.
    if (resultat === "indisponible") demanderAffichageManuel();
  }

  if (!visible) return null;

  // Design v3 (24/10) : une feuille comme les autres (coins de 28 px, fond
  // papier, ombre-feuille, voile sans flou), le bouton plein large et le
  // secondaire en creux.
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div aria-hidden className="absolute inset-0 feuille-voile bg-black/40 dark:bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-premier-lancement"
        className="onboarding-entree relative w-full rounded-t-[28px] bg-paper p-6 ombre-feuille [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-[28px] sm:p-8"
      >
        <h2 id="titre-premier-lancement" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink [text-wrap:balance]">
          {ordinateur ? "Compyo sur votre ordinateur" : "Compyo sur votre téléphone"}
        </h2>
        <p className="mt-2 text-base text-steel [text-wrap:pretty]">
          {bloqueAndroid
            ? "Sur ce téléphone, Compyo s'installe depuis Chrome : ouvrez cette page dans Chrome, puis « Installer »."
            : modeIOS
              ? "Appuyez sur Partager, puis « Sur l'écran d'accueil » : Compyo s'ouvre ensuite d'un geste."
              : ordinateur
                ? "Installez Compyo : il s'ouvre ensuite d'un clic, dans sa propre fenêtre."
                : "Installez Compyo : il s'ouvre ensuite d'un geste, comme une application."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {bloqueAndroid ? (
            <button
              type="button"
              onClick={() => {
                terminer();
                window.location.href = "/installer";
              }}
              className={BOUTON_PLEIN_LARGE}
            >
              Voir comment faire
            </button>
          ) : (
            <button type="button" onClick={installer} disabled={installationEnCours} className={BOUTON_PLEIN_LARGE}>
              {installationEnCours ? "Un instant…" : modeIOS ? "J'ai compris" : "Installer Compyo"}
            </button>
          )}
          <button type="button" onClick={terminer} className={BOUTON_CREUX_LARGE}>
            Continuer dans le navigateur
          </button>
        </div>
      </div>
    </div>
  );
}
