// ============================================================
// État partagé de l'installation PWA — consultable et déclenchable depuis
// n'importe où dans l'app (la carte de InstallPWA.tsx, le petit lien
// "Installer l'application" de la Sidebar, l'écran 4 de l'onboarding).
// Un module JS simple plutôt qu'un contexte React : la carte
// d'installation vit dans le layout racine, en dehors de l'arbre où ce
// lien est utilisé, et l'événement à capter est de toute façon unique par
// session — pas besoin de plus.
//
// 20/09 — D'OÙ VIENT L'ÉVÉNEMENT. Chrome déclenche "beforeinstallprompt"
// très tôt pendant le chargement de la page, et ne le rejoue JAMAIS :
// personne à l'écoute à cet instant = installation programmatique perdue
// pour toute la visite. Or un useEffect ne s'exécute qu'après
// l'hydratation de React, et sur un téléphone React démarre plus
// lentement que Chrome n'envoie l'événement — l'artisan appuyait donc sur
// "Installer Compyo" et tombait sur les instructions manuelles de repli,
// alors que Chrome proposait bien l'installation depuis son menu ⋮.
// L'événement est maintenant capté par un script en ligne exécuté dans le
// <head> (voir app/layout.tsx), avant tout React, et mis de côté dans
// window.__compyoInstallPrompt. Ce module le lit là en priorité, et garde
// son propre écouteur pour les événements qui arriveraient plus tard.
// ============================================================

export type EvenementInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    // Posé par le script en ligne de app/layout.tsx. Peut être absent si
    // ce script n'a pas tourné (rendu serveur, navigateur exotique) :
    // toujours lire via evenementDisponible().
    __compyoInstallPrompt?: EvenementInstallation | null;
  }
}

import { detecterPlateforme, detecterMoteurRestreint } from "@/lib/pwa/plateforme";

let evenementCapture: EvenementInstallation | null = null;
let ecouteInitialisee = false;

// Les deux réserves possibles, dans l'ordre : celle de ce module (posée
// par l'écouteur ci-dessous) puis celle du script en ligne.
function evenementDisponible(): EvenementInstallation | null {
  if (typeof window === "undefined") return null;
  return evenementCapture ?? window.__compyoInstallPrompt ?? null;
}

function memoriserEvenement(e: EvenementInstallation) {
  evenementCapture = e;
  window.__compyoInstallPrompt = e;
}

// Un événement "beforeinstallprompt" ne sert qu'une fois : après un
// prompt() accepté ou refusé, il est mort. Le vider des DEUX côtés, sinon
// la Sidebar continuerait de proposer un bouton qui ne ferait plus rien.
function oublierEvenement() {
  evenementCapture = null;
  if (typeof window !== "undefined") window.__compyoInstallPrompt = null;
}

function prevenirPret() {
  window.dispatchEvent(new CustomEvent("compyo:install-prompt-pret"));
}

export function estIOS(): boolean {
  return detecterPlateforme() === "ios";
}

export function estDejaInstallee(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// À appeler une fois (idempotent) au montage de InstallPWA — récupère
// l'événement déjà mis de côté par le script en ligne du <head> (cas
// normal sur mobile, voir l'en-tête de ce fichier), et garde un écouteur
// pour celui qui arriverait plus tard (l'événement peut être renvoyé plus
// tard dans la visite, par exemple après une navigation). Dans les deux
// cas, prévient les composants intéressés (le petit lien de la Sidebar,
// qui doit savoir quand devenir cliquable) via un événement DOM.
export function initialiserEcouteInstallation() {
  if (typeof window === "undefined" || ecouteInitialisee) return;
  ecouteInitialisee = true;

  const dejaCapte = window.__compyoInstallPrompt ?? null;
  if (dejaCapte) {
    evenementCapture = dejaCapte;
    // Au tour de boucle suivant, pas tout de suite : les composants montés
    // dans le même rendu que celui qui nous appelle (le lien de la
    // Sidebar) n'ont pas forcément encore posé leur écouteur.
    setTimeout(prevenirPret, 0);
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    memoriserEvenement(e as EvenementInstallation);
    prevenirPret();
  });
  window.addEventListener("appinstalled", () => {
    oublierEvenement();
    window.dispatchEvent(new CustomEvent("compyo:install-terminee"));
  });
}

// true dès qu'on peut proposer une installation : soit l'événement
// Chrome/Edge/Android est arrivé, soit on est sur iOS (où il n'existe
// jamais, mais "Ajouter à l'écran d'accueil" reste possible manuellement),
// soit on est dans un navigateur restreint (in-app WhatsApp/Instagram,
// Firefox Android, Samsung Internet) où beforeinstallprompt n'arrivera
// jamais mais où des instructions manuelles restent utiles (🔴F, Sprint
// Beta Final 27/08) — mieux vaut guider l'artisan que ne rien proposer.
export function peutProposerInstallation(): boolean {
  return estIOS() || evenementDisponible() !== null || detecterMoteurRestreint() !== null;
}

export async function declencherInstallation(): Promise<
  "accepted" | "dismissed" | "indisponible"
> {
  const evenement = evenementDisponible();
  if (!evenement) return "indisponible";

  try {
    await evenement.prompt();
  } catch {
    // Prompt refusé par le navigateur (appel hors geste utilisateur, par
    // exemple) : l'événement n'a pas été consommé, on le garde pour le
    // prochain essai plutôt que de le jeter.
    return "indisponible";
  }

  // À partir d'ici l'événement est mort, quel que soit le choix de
  // l'artisan : plus personne ne doit le proposer.
  oublierEvenement();
  try {
    const choix = await evenement.userChoice;
    return choix.outcome;
  } catch {
    // Réponse illisible (cas non documenté) : on traite comme un refus
    // plutôt que de laisser l'appelant sur une promesse rejetée.
    return "dismissed";
  }
}

// Utilisé par le lien discret (Sidebar) pour rouvrir la carte
// d'installation à la demande de l'artisan, sans limite ni cooldown —
// contrairement à la proposition automatique (une seule fois, voir
// InstallPWA.tsx), un geste volontaire n'a jamais besoin d'être filtré.
export function demanderAffichageManuel() {
  window.dispatchEvent(new CustomEvent("compyo:install-demande-manuelle"));
}

// Utilisé par l'onboarding premier lancement (voir
// components/onboarding/PremierLancement.tsx) : son écran 4 propose déjà
// l'installation une fois — sans ça, la carte automatique de InstallPWA.tsx
// se déclencherait une seconde fois 30 secondes plus tard pour le même
// artisan qui vient de répondre à la même question.
const CLE_DEJA_PROPOSE_AUTO = "compyo-install-deja-propose-auto";
export function marquerInstallationDejaProposee() {
  try {
    window.localStorage.setItem(CLE_DEJA_PROPOSE_AUTO, "1");
  } catch {
    // Sans conséquence grave : au pire la carte automatique se propose
    // quand même une fois, jamais bloquant.
  }
}
