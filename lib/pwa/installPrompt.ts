// ============================================================
// État partagé de l'installation PWA — capté une fois par
// components/pwa/InstallPWA.tsx, mais consultable et déclenchable depuis
// n'importe où dans l'app (ex. le petit lien "Installer l'application"
// de la Sidebar). Un module JS simple plutôt qu'un contexte React : la
// carte d'installation vit dans le layout racine, en dehors de l'arbre
// où ce lien est utilisé, et l'événement à capter est de toute façon
// unique par session — pas besoin de plus.
// ============================================================

export type EvenementInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

import { detecterPlateforme, detecterMoteurRestreint } from "@/lib/pwa/plateforme";

let evenementCapture: EvenementInstallation | null = null;
let ecouteInitialisee = false;

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

// À appeler une fois (idempotent) au montage de InstallPWA — capte
// l'événement "beforeinstallprompt" dès qu'il arrive (le navigateur le
// déclenche de façon asynchrone après le chargement, pas immédiatement)
// et prévient tout composant intéressé (ex. le petit lien de la Sidebar,
// qui doit savoir quand devenir cliquable) via un événement DOM.
export function initialiserEcouteInstallation() {
  if (typeof window === "undefined" || ecouteInitialisee) return;
  ecouteInitialisee = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evenementCapture = e as EvenementInstallation;
    window.dispatchEvent(new CustomEvent("compyo:install-prompt-pret"));
  });
  window.addEventListener("appinstalled", () => {
    evenementCapture = null;
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
  return estIOS() || evenementCapture !== null || detecterMoteurRestreint() !== null;
}

export async function declencherInstallation(): Promise<
  "accepted" | "dismissed" | "indisponible"
> {
  if (!evenementCapture) return "indisponible";
  await evenementCapture.prompt();
  const choix = await evenementCapture.userChoice;
  evenementCapture = null;
  return choix.outcome;
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
