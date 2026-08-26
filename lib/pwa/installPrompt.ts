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

let evenementCapture: EvenementInstallation | null = null;
let ecouteInitialisee = false;

export function estIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
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
// jamais, mais "Ajouter à l'écran d'accueil" reste possible manuellement).
export function peutProposerInstallation(): boolean {
  return estIOS() || evenementCapture !== null;
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
