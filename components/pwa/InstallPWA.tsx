"use client";

import { useEffect, useState } from "react";
import {
  declencherInstallation,
  estDejaInstallee,
  estIOS,
  initialiserEcouteInstallation,
  peutProposerInstallation,
} from "@/lib/pwa/installPrompt";
import { detecterPlateforme, detecterMoteurRestreint, type MoteurRestreint } from "@/lib/pwa/plateforme";

// Sprint Beta Final (27/08) — 🔴F : texte d'instructions par navigateur
// restreint (voir lib/pwa/plateforme.ts pour le pourquoi de chaque cas).
// Toujours une instruction concrète et actionnable, jamais un message
// vague type "installation indisponible".
function texteInstructionsMoteurRestreint(moteur: MoteurRestreint): string {
  switch (moteur) {
    case "webview_app":
      return "Ce lien s'est ouvert dans l'appli qui vous l'a envoyé, pas dans votre navigateur. Appuyez sur ⋮ ou ••• en haut, puis \"Ouvrir dans le navigateur\" — vous pourrez installer Compyo depuis là.";
    case "firefox_android":
      return "Appuyez sur ⋮ en haut à droite de Firefox, puis \"Installer\" (ou \"Ajouter à l'écran d'accueil\").";
    case "samsung_internet":
      return "Appuyez sur ☰ en bas, puis \"Ajouter une page à\" → \"Écran d'accueil\".";
    default:
      return "";
  }
}

// ============================================================
// Carte discrète "Installer Compyo" — jamais une popup au chargement, et
// jamais répétée toute seule. Deux façons de l'afficher :
//
// 1. AUTOMATIQUE, une seule fois par navigateur : 30 secondes après la
//    toute première visite éligible, pour laisser à l'artisan le temps de
//    comprendre ce qu'est Compyo avant de lui proposer de l'installer.
//    Que la réponse soit "Installer" ou "Plus tard" (ou même qu'il
//    n'interagisse pas du tout), Compyo ne la reproposera plus jamais
//    tout seul — un artisan qui ne veut pas installer ne doit pas revoir
//    cette carte à chaque ouverture.
// 2. MANUELLE, sans limite : un petit lien "Installer l'application",
//    toujours discret, reste disponible dans la Sidebar (voir
//    components/dashboard/Sidebar.tsx) pour l'artisan qui a ignoré la
//    proposition initiale ou changé d'avis plus tard. Un geste volontaire
//    de l'utilisateur n'a pas besoin d'être filtré.
//
// Sur iOS, l'API d'installation programmatique n'existe pas : Safari
// n'expose aucun moyen de déclencher "Ajouter à l'écran d'accueil" depuis
// du code, uniquement via son propre menu de partage. On adapte donc le
// contenu de la carte (instructions au lieu d'un bouton actif) plutôt que
// de cacher la fonctionnalité à ces utilisateurs.
// ============================================================

const CLE_DEJA_PROPOSE_AUTO = "compyo-install-deja-propose-auto";
const DELAI_AVANT_PROPOSITION_MS = 30_000;

export function InstallPWA() {
  const [afficherCarte, setAfficherCarte] = useState(false);
  const [modeIOS, setModeIOS] = useState(false);
  // "Parcours PWA par appareil" (27/08) — modeIOS pilote déjà le seul choix
  // qui compte techniquement (bouton actif ou instructions manuelles,
  // faute d'API d'installation programmatique sur Safari) ; plateforme
  // affine seulement le TEXTE affiché dans les deux autres cas, pour ne
  // pas parler d'"écran d'accueil" à un artisan sur ordinateur.
  const [plateforme, setPlateforme] = useState<"android" | "ios" | "desktop">("android");
  const [moteurRestreint, setMoteurRestreint] = useState<MoteurRestreint>(null);
  const [installationEnCours, setInstallationEnCours] = useState(false);
  const [installationReussie, setInstallationReussie] = useState(false);

  useEffect(() => {
    initialiserEcouteInstallation();
    setModeIOS(estIOS());
    setPlateforme(detecterPlateforme());
    setMoteurRestreint(detecterMoteurRestreint());

    const gererDemandeManuelle = () => {
      setModeIOS(estIOS());
      setPlateforme(detecterPlateforme());
      setMoteurRestreint(detecterMoteurRestreint());
      setInstallationReussie(false);
      setAfficherCarte(true);
    };
    window.addEventListener("compyo:install-demande-manuelle", gererDemandeManuelle);

    if (estDejaInstallee()) {
      return () =>
        window.removeEventListener("compyo:install-demande-manuelle", gererDemandeManuelle);
    }

    let dejaPropose = false;
    try {
      dejaPropose = window.localStorage.getItem(CLE_DEJA_PROPOSE_AUTO) === "1";
    } catch {
      // Stockage indisponible : on considère prudemment que non, tant pis
      // si ça se propose une fois de plus qu'idéal dans ce cas rare.
    }

    let minuteur: ReturnType<typeof setTimeout> | null = null;
    if (!dejaPropose) {
      minuteur = setTimeout(() => {
        if (!peutProposerInstallation()) return;
        try {
          window.localStorage.setItem(CLE_DEJA_PROPOSE_AUTO, "1");
        } catch {
          // Idem : si le stockage échoue, on affiche quand même cette
          // fois-ci, seul le "plus jamais tout seul" est en jeu ici.
        }
        setAfficherCarte(true);
      }, DELAI_AVANT_PROPOSITION_MS);
    }

    return () => {
      window.removeEventListener("compyo:install-demande-manuelle", gererDemandeManuelle);
      if (minuteur) clearTimeout(minuteur);
    };
  }, []);

  // Sprint Robustesse (30/08) — expose l'état d'affichage de la carte via un
  // évènement custom global : tant qu'elle est visible, elle recouvre en
  // pleine largeur (fixed inset-x-4) le bouton flottant "Avis & idées"
  // (BoutonRetour.tsx, fixed right-5) qui se trouve dans la même zone en
  // bas de l'écran mobile. BoutonRetour.tsx écoute cet évènement pour se
  // décaler vers le haut le temps que la carte est affichée, plutôt que de
  // rester relevé en permanence (ce qui gênerait inutilement le reste du
  // temps).
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("compyo:install-carte-visible", { detail: { visible: afficherCarte } })
    );
  }, [afficherCarte]);

  function fermer() {
    setAfficherCarte(false);
  }

  async function installer() {
    setInstallationEnCours(true);
    const resultat = await declencherInstallation();
    setInstallationEnCours(false);
    if (resultat === "accepted") {
      setInstallationReussie(true);
      setTimeout(() => setAfficherCarte(false), 2200);
    } else {
      fermer();
    }
  }

  if (!afficherCarte) return null;

  return (
    <div className="pwa-carte-entree fixed inset-x-4 z-50 sm:inset-x-auto sm:right-6 sm:w-96 [bottom:calc(1rem+env(safe-area-inset-bottom))] sm:[bottom:calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="rounded-2xl border border-ink/10 bg-surface shadow-lg shadow-ink/10 p-4">
        {installationReussie ? (
          <div className="flex items-center gap-3 py-1">
            <span className="text-xl" aria-hidden="true">
              ✓
            </span>
            <p className="text-sm font-medium text-ink">
              Compyo s&apos;installe sur votre téléphone…
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-signal/10 border border-signal/20 flex items-center justify-center">
                <span className="text-lg" aria-hidden="true">
                  📲
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {plateforme === "desktop" ? "Installer Compyo sur cet ordinateur" : "Installer Compyo"}
                </p>
                <p className="mt-1 text-xs text-ink/60 leading-relaxed">
                  {moteurRestreint
                    ? texteInstructionsMoteurRestreint(moteurRestreint)
                    : modeIOS
                      ? "Ajoutez Compyo à votre écran d'accueil : appuyez sur Partager puis \"Sur l'écran d'accueil\"."
                      : plateforme === "desktop"
                        ? "Ouvrez Compyo depuis votre bureau ou votre barre des tâches, dans sa propre fenêtre, sans passer par le navigateur."
                        : "Ouvrez Compyo en un geste depuis votre écran d'accueil, comme une vraie application."}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button
                onClick={fermer}
                className="text-xs font-medium text-ink/50 hover:text-ink px-3 py-2 transition-colors"
              >
                Plus tard
              </button>
              {/*
                Sprint Beta Final (27/08) — 🔴F : sans moteurRestreint dans
                cette condition, un artisan dans WhatsApp/Firefox Android/
                Samsung Internet voyait un bouton "Installer" actif qui ne
                faisait RIEN au clic (declencherInstallation() retombe sur
                "indisponible" faute de beforeinstallprompt) — pire qu'une
                absence de bouton, ça ressemble à un bug de l'app.
              */}
              {!modeIOS && !moteurRestreint && (
                <button
                  onClick={installer}
                  disabled={installationEnCours}
                  className="text-xs font-medium bg-ink text-paper rounded-lg px-3.5 py-2 transition-colors hover:bg-signal disabled:opacity-60"
                >
                  {installationEnCours ? "Installation…" : "Installer"}
                </button>
              )}
              {(modeIOS || moteurRestreint) && (
                <button
                  onClick={fermer}
                  className="text-xs font-medium bg-ink text-paper rounded-lg px-3.5 py-2 transition-colors hover:bg-signal"
                >
                  J&apos;ai compris
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
