// ============================================================
// Détection de plateforme — source unique, réutilisée partout où le
// parcours doit s'adapter à l'appareil (menu "Nouveau projet", carte
// d'installation PWA...). Volontairement en "best effort", jamais comme
// verrou de sécurité : voir onboarding-mobile-pwa-faisabilite.md, ces
// détections ont des cas limites connus (iPad qui s'annonce parfois comme
// macOS, navigateurs qui masquent leur user-agent).
// ============================================================

export type Plateforme = "android" | "ios" | "desktop";

export function detecterPlateforme(): Plateforme {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS 13+ s'annonce comme macOS en desktop-mode par défaut — seul
  // signal fiable côté client : le support du tactile, absent des vrais
  // Mac. Best-effort assumé (voir note ci-dessus), pas un cas critique
  // pour Compyo (un iPad reste un usage minoritaire pour un artisan).
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "desktop";
}

// Sprint Beta Final (27/08) — 🔴F. Un artisan qui reçoit le lien de
// Compyo par WhatsApp/SMS/Instagram et tape dessus ne s'ouvre PAS dans
// son vrai navigateur : ces applis embarquent leur propre mini-
// navigateur ("in-app browser"), qui n'implémente jamais l'API standard
// d'installation (beforeinstallprompt), même quand le moteur en dessous
// est Chrome. Sans détection, le bouton "Installer" ne fait rien et
// l'artisan croit Compyo cassé. Firefox Android et Samsung Internet ont
// eux aussi leur propre mécanisme, incompatible avec beforeinstallprompt.
// Détection best-effort par user-agent — pas un verrou de sécurité, juste
// un aiguillage vers le bon texte d'instructions (voir composants/pwa/
// InstallPWA.tsx).
export type MoteurRestreint = "webview_app" | "firefox_android" | "samsung_internet" | null;

export function detecterMoteurRestreint(): MoteurRestreint {
  if (typeof window === "undefined") return null;
  const ua = window.navigator.userAgent;

  // Navigateurs "in-app" les plus courants pour un artisan qui reçoit un
  // lien Compyo d'un client ou d'un collègue : WhatsApp, Instagram,
  // Facebook/Messenger, Snapchat, TikTok, Line, WeChat. Beaucoup s'annoncent
  // simplement comme "; wv)" (WebView Android générique) sans nom d'appli.
  if (/FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|; ?wv\)/i.test(ua)) {
    return "webview_app";
  }
  if (/Android/i.test(ua) && /Firefox/i.test(ua)) return "firefox_android";
  if (/SamsungBrowser/i.test(ua)) return "samsung_internet";
  return null;
}
