"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  declencherInstallation,
  estDejaInstallee,
  estIOS,
  initialiserEcouteInstallation,
  marquerInstallationDejaProposee,
} from "@/lib/pwa/installPrompt";
import { detecterPlateforme, type Plateforme } from "@/lib/pwa/plateforme";

// ============================================================
// "Premier contact sans friction" (27/08) — premier lancement, PAS un
// tutoriel classique : 4 écrans, texte minimal, l'objectif est que
// l'artisan comprenne en quelques secondes que Compyo s'intègre à ses
// habitudes (WhatsApp/SMS/mail) plutôt que de lui en imposer de
// nouvelles. Ne s'affiche qu'une seule fois par navigateur (même
// convention que components/pwa/InstallPWA.tsx) — jamais reproposé, même
// en cas de fermeture sans terminer.
// ============================================================

const CLE_ONBOARDING_VU = "compyo-onboarding-vu";
const TOTAL_ECRANS = 4;

const ICONES_CANAUX = [
  { icone: "💬", nom: "WhatsApp" },
  { icone: "✉️", nom: "SMS" },
  { icone: "📧", nom: "Mail" },
  { icone: "📞", nom: "Téléphone" },
];

function texteFluxAndroid() {
  return [
    { icone: "💬", label: "WhatsApp" },
    { icone: "📤", label: "Partager" },
    { icone: "🧡", label: "Compyo" },
  ];
}

function texteFluxAutre() {
  return [
    { icone: "💬", label: "Message reçu" },
    { icone: "📋", label: "Collé dans Compyo" },
    { icone: "🧡", label: "Brouillon prêt" },
  ];
}

export function PremierLancement() {
  const [visible, setVisible] = useState(false);
  const [ecran, setEcran] = useState(1);
  const [plateforme, setPlateforme] = useState<Plateforme>("desktop");
  const [modeIOS, setModeIOS] = useState(false);
  const [etapeFlux, setEtapeFlux] = useState(0);
  const [installationEnCours, setInstallationEnCours] = useState(false);

  useEffect(() => {
    initialiserEcouteInstallation();

    if (estDejaInstallee()) return;

    let dejaVu = false;
    try {
      dejaVu = window.localStorage.getItem(CLE_ONBOARDING_VU) === "1";
    } catch {
      // Stockage indisponible : tant pis, on ne bloque jamais l'accès à
      // l'app pour ça — l'onboarding ne s'affichera simplement pas.
    }

    if (!dejaVu) {
      setPlateforme(detecterPlateforme());
      setModeIOS(estIOS());
      setVisible(true);
    }
  }, []);

  // Anime l'écran 3 (démonstration du flux) en boucle tant qu'il est
  // affiché — trois étapes qui s'allument l'une après l'autre.
  useEffect(() => {
    if (!visible || ecran !== 3) return;
    setEtapeFlux(0);
    const intervalle = setInterval(() => {
      setEtapeFlux((e) => (e + 1) % 4);
    }, 900);
    return () => clearInterval(intervalle);
  }, [visible, ecran]);

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
    await declencherInstallation();
    setInstallationEnCours(false);
    terminer();
  }

  if (!visible) return null;

  const flux = plateforme === "android" ? texteFluxAndroid() : texteFluxAutre();

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-6">
      <div className="onboarding-entree w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-ink/10 bg-surface shadow-xl shadow-ink/20 p-6 sm:p-8 [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))]">
        {/* Points de progression — jamais de bouton "passer" agressif,
            juste un chemin de sortie discret (le bouton fermer, écran par
            écran) cohérent avec "jamais forcé" demandé pour l'écran 4. */}
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: TOTAL_ECRANS }, (_, i) => i + 1).map((n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === ecran ? "w-6 bg-signal" : "w-1.5 bg-ink/15"
              }`}
            />
          ))}
        </div>

        {ecran === 1 && (
          <div className="mt-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal/10 border border-signal/20 text-2xl">
              🧡
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold text-ink">
              Bienvenue sur Compyo
            </h2>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              L&apos;administratif se fait tout seul en arrière-plan. Vous gagnez du
              temps sur chaque nouvelle demande, sans rien changer à vos habitudes.
            </p>
          </div>
        )}

        {ecran === 2 && (
          <div className="mt-8 text-center">
            <h2 className="font-display text-xl font-semibold text-ink">
              Recevez vos demandes comme d&apos;habitude
            </h2>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              WhatsApp, SMS, mail, téléphone — vous ne changez rien à votre façon de
              travailler.
            </p>
            <div className="mt-6 grid grid-cols-4 gap-3">
              {ICONES_CANAUX.map((c) => (
                <div key={c.nom} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-warm border border-ink/10 text-xl">
                    {c.icone}
                  </div>
                  <span className="text-[11px] text-ink/50">{c.nom}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ecran === 3 && (
          <div className="mt-8 text-center">
            <h2 className="font-display text-xl font-semibold text-ink">
              {plateforme === "android"
                ? "Un partage suffit"
                : "Collez, Compyo prépare le reste"}
            </h2>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              {plateforme === "android"
                ? "Depuis WhatsApp, SMS ou Mail : Partager → Compyo. Le projet est créé automatiquement."
                : "Collez le message reçu dans Compyo : un brouillon est prêt en quelques secondes, à valider d'un geste."}
            </p>
            <div className="mt-7 flex items-center justify-center gap-2">
              {flux.map((etape, i) => (
                <div key={etape.label} className="flex items-center gap-2">
                  <div
                    className={`onboarding-etape-flux flex flex-col items-center gap-1.5 ${
                      etapeFlux >= i ? "onboarding-etape-active" : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper-warm border border-ink/10 text-lg">
                      {etape.icone}
                    </div>
                    <span className="text-[10px] text-ink/50">{etape.label}</span>
                  </div>
                  {i < flux.length - 1 && (
                    <span
                      className={`onboarding-fleche-flux text-ink/40 ${
                        etapeFlux > i ? "onboarding-fleche-active" : ""
                      }`}
                    >
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {ecran === 4 && (
          <div className="mt-8 text-center">
            <h2 className="font-display text-xl font-semibold text-ink">
              {estDejaInstallee() ? "Vous êtes prêt" : "Une dernière chose"}
            </h2>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              {modeIOS
                ? "Installez Compyo sur votre écran d'accueil pour l'ouvrir en un geste : appuyez sur Partager puis \"Sur l'écran d'accueil\"."
                : "Installez Compyo sur votre téléphone pour l'ouvrir en un geste, comme une vraie application — ou continuez directement dans le navigateur."}
            </p>
            {/*
              Sprint Beta Final (27/08) — 🔴I : ces deux boutons
              réimplémentaient leur propre style au lieu du composant
              Button partagé (voir components/ui/Button.tsx) — pas de
              hover scale/shadow, pas d'anneau focus-visible clavier,
              divergence silencieuse du reste de l'app à chaque retouche
              de Button.tsx. `loading` (voir 🔴I, spinner IA) réutilisé
              ici aussi : même bénéfice pendant l'appel d'installation.
            */}
            <div className="mt-6 flex flex-col gap-2.5">
              <Button variant="secondary" onClick={installer} loading={installationEnCours} className="w-full">
                {installationEnCours
                  ? "Installation…"
                  : modeIOS
                    ? "J'ai compris"
                    : "Installer Compyo sur mon téléphone"}
              </Button>
              <Button variant="ghost" onClick={terminer} className="w-full border-transparent">
                Continuer dans le navigateur
              </Button>
            </div>
          </div>
        )}

        {ecran < TOTAL_ECRANS && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={terminer}
              className="text-xs text-ink/40 hover:text-ink/70 transition-colors"
            >
              Passer
            </button>
            <Button variant="secondary" onClick={() => setEcran((e) => e + 1)} className="px-5 py-2.5">
              Suivant
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
