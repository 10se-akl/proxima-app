"use client";

import { useEffect, useState } from "react";
import {
  declencherInstallation,
  estDejaInstallee,
  estIOS,
  initialiserEcouteInstallation,
  installationDirectePossible,
  peutProposerInstallation,
} from "@/lib/pwa/installPrompt";
import {
  detecterPlateforme,
  detecterMoteurRestreint,
  installationBloqueeParAndroid,
  type MoteurRestreint,
} from "@/lib/pwa/plateforme";

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
      // 20/09 — Sur Android 14+, le menu de Samsung Internet mène à
      // « Appli non sécurisée et bloquée » : le paquet qu'il fabrique vise
      // une version trop ancienne du système. Inutile d'y envoyer
      // l'artisan (voir installationBloqueeParAndroid).
      return installationBloqueeParAndroid()
        ? "Android refuse les installations venant de Samsung Internet. Ouvrez cette page dans Chrome : elle s'y installe en un bouton."
        : "Appuyez sur ☰ en bas, puis \"Ajouter une page à\" → \"Écran d'accueil\".";
    default:
      return "";
  }
}

// 20/09 — Dernier recours, quand le clic sur "Installer" n'a rien donné :
// le navigateur n'a jamais envoyé son événement d'installation, ou il a
// déjà été consommé. Tous les navigateurs qui savent installer une PWA
// gardent une entrée dans leur propre menu : on y envoie l'artisan plutôt
// que de refermer la carte sans explication.
function texteInstallationManuelle(plateforme: "android" | "ios" | "desktop"): string {
  return plateforme === "desktop"
    ? "Votre navigateur n'a pas proposé la fenêtre d'installation. Cliquez sur l'icône d'installation à droite de la barre d'adresse, ou ouvrez le menu ⋮ puis \"Installer Compyo\"."
    : "Votre navigateur n'a pas proposé la fenêtre d'installation. Ouvrez son menu (⋮ en haut, ou ☰ en bas), puis \"Installer l'application\" ou \"Ajouter à l'écran d'accueil\".";
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
  // Le navigateur a-t-il envoyé son événement d'installation ? C'est ce
  // qui décide d'un vrai bouton plutôt que d'instructions à suivre —
  // jamais le nom du navigateur (20/09, voir lib/pwa/installPrompt.ts).
  const [installationDirecte, setInstallationDirecte] = useState(false);
  const [installationEnCours, setInstallationEnCours] = useState(false);
  const [installationReussie, setInstallationReussie] = useState(false);
  // Le clic n'a rien donné : on bascule sur le chemin manuel du navigateur
  // plutôt que de refermer la carte en silence.
  const [echecInstallation, setEchecInstallation] = useState(false);

  useEffect(() => {
    initialiserEcouteInstallation();
    setModeIOS(estIOS());
    setPlateforme(detecterPlateforme());
    setMoteurRestreint(detecterMoteurRestreint());
    setInstallationDirecte(installationDirectePossible());

    // L'événement d'installation peut arriver après l'affichage de la
    // carte : dans ce cas les instructions manuelles laissent la place au
    // vrai bouton, sans que l'artisan ait à recharger quoi que ce soit.
    const reevaluer = () => setInstallationDirecte(installationDirectePossible());
    window.addEventListener("compyo:install-prompt-pret", reevaluer);
    window.addEventListener("compyo:install-terminee", reevaluer);

    const gererDemandeManuelle = () => {
      setModeIOS(estIOS());
      setPlateforme(detecterPlateforme());
      setMoteurRestreint(detecterMoteurRestreint());
      setInstallationDirecte(installationDirectePossible());
      setInstallationReussie(false);
      setEchecInstallation(false);
      setAfficherCarte(true);
    };
    window.addEventListener("compyo:install-demande-manuelle", gererDemandeManuelle);

    const retirerEcoutes = () => {
      window.removeEventListener("compyo:install-prompt-pret", reevaluer);
      window.removeEventListener("compyo:install-terminee", reevaluer);
      window.removeEventListener("compyo:install-demande-manuelle", gererDemandeManuelle);
    };

    if (estDejaInstallee()) return retirerEcoutes;

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
      retirerEcoutes();
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
      return;
    }
    if (resultat === "indisponible") {
      // Le navigateur n'avait finalement rien à proposer. Refermer la
      // carte sans un mot, c'est exactement le "j'appuie et rien ne se
      // passe" qui fait abandonner un artisan : on montre le chemin
      // manuel du navigateur, qui lui existe toujours.
      setEchecInstallation(true);
      return;
    }
    fermer();
  }

  if (!afficherCarte) return null;

  // 20/09 — L'événement l'emporte sur le user-agent : s'il est là,
  // l'installation se fait en un bouton, même dans un navigateur qu'on
  // croyait restreint (Samsung Internet l'envoie selon les versions).
  // Sans événement, on retombe sur les instructions manuelles, qui
  // restent le bon comportement dans WhatsApp/Instagram, Firefox Android
  // et sur iOS, où cet événement n'existe pas.
  const enUnGeste = !echecInstallation && (installationDirecte || (!modeIOS && !moteurRestreint));

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
                  {/* Sans enUnGeste : le clic a échoué, ou c'est un
                      navigateur restreint, ou iOS. */}
                  {enUnGeste
                    ? plateforme === "desktop"
                      ? "Ouvrez Compyo depuis votre bureau ou votre barre des tâches, dans sa propre fenêtre, sans passer par le navigateur."
                      : "Ouvrez Compyo en un geste depuis votre écran d'accueil, comme une vraie application."
                    : echecInstallation
                      ? texteInstallationManuelle(plateforme)
                      : moteurRestreint
                        ? texteInstructionsMoteurRestreint(moteurRestreint)
                        : "Ajoutez Compyo à votre écran d'accueil : appuyez sur Partager puis \"Sur l'écran d'accueil\"."}
                </p>
                {/* 20/09 — Quand on en est aux instructions, la page
                    /installer donne le pas-à-pas complet du navigateur
                    détecté, et le diagnostic à nous envoyer si ça coince. */}
                {!enUnGeste && (
                  <a
                    href="/installer"
                    className="mt-1.5 inline-block text-xs font-medium text-signal underline underline-offset-2"
                  >
                    Voir le pas-à-pas
                  </a>
                )}
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
                Sprint Beta Final (27/08) — 🔴F : un bouton "Installer" qui
                ne fait RIEN au clic est pire qu'une absence de bouton, ça
                ressemble à un bug de l'app. La règle reste donc : pas de
                bouton sans installation réellement possible.
                20/09 — mais c'est l'ÉVÉNEMENT du navigateur qui en décide,
                plus son nom. Un bêta-testeur sous Samsung Internet n'avait
                que des instructions à suivre alors que son navigateur
                savait installer Compyo en un bouton.
              */}
              {enUnGeste ? (
                <button
                  onClick={installer}
                  disabled={installationEnCours}
                  className="text-xs font-medium bg-ink text-paper rounded-lg px-3.5 py-2 transition-colors hover:bg-signal disabled:opacity-60"
                >
                  {installationEnCours ? "Installation…" : "Installer"}
                </button>
              ) : (
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
