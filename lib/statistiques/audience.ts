// ============================================================
// Mesure d'audience maison (Module 44, 22/09) — ce qu'on déduit d'une
// visite, sans rien garder de personnel.
//
// Tout part de deux informations que le navigateur envoie de toute façon :
// son « identité » (user-agent) et la page d'où il vient (référent). On en
// tire un type d'appareil, un navigateur et un nom de site d'origine —
// jamais l'adresse complète d'où vient le visiteur, qui peut contenir des
// informations personnelles (une recherche, un identifiant de message).
// ============================================================

export type Appareil = "mobile" | "tablette" | "ordinateur";

// Seulement des mots qu'un vrai navigateur n'envoie JAMAIS. « WhatsApp »
// n'y est pas : son navigateur intégré est un vrai visiteur (les aperçus
// de liens, eux, n'exécutent pas de JavaScript et n'arrivent jamais ici).
const ROBOTS =
  /bot\b|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|curl\/|wget|python-|axios|node-fetch|go-http|java\/|okhttp|scrapy|phantom|selenium|puppeteer|playwright/i;

export function estRobot(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 20) return true;
  // CUBOT est une marque de téléphones Android d'entrée de gamme — le
  // public même de Compyo. Sans cette exception, « bot » les rangerait
  // parmi les robots.
  return ROBOTS.test(ua.replace(/cubot/gi, ""));
}

/** `tactile` vient du navigateur (écran tactile ou non) : un iPad récent
 *  se présente comme un Mac, seul le tactile le trahit. */
export function appareilDepuisUA(ua: string, tactile = false): Appareil {
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) return "tablette";
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return "tablette";
  if (/macintosh/i.test(ua) && tactile) return "tablette";
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return "mobile";
  return "ordinateur";
}

export function navigateurDepuisUA(ua: string): string {
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/FBAN|FBAV|Instagram/i.test(ua)) return "Facebook / Instagram";
  if (/; ?wv\)/i.test(ua)) return "Navigateur intégré";
  if (/Edg(A|iOS)?\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/CriOS|Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Autre";
}

const SITES_CONNUS: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)qwant\.com$/, "Qwant"],
  [/(^|\.)ecosia\.org$/, "Ecosia"],
  [/(^|\.)(facebook\.com|fb\.me|fb\.com)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X (Twitter)"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "YouTube"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
];

/** Le nom du site d'où arrive le visiteur, ou null pour un accès direct
 *  ou une navigation à l'intérieur de Compyo. Jamais l'adresse complète. */
export function origineDepuisReferent(referent: string | null | undefined, hoteDuSite: string): string | null {
  if (!referent) return null;
  // Applications Android qui ouvrent un lien : "android-app://com.google.android.gm"
  if (referent.startsWith("android-app://")) {
    if (/gm\b|gmail/.test(referent)) return "Gmail";
    if (/whatsapp/.test(referent)) return "WhatsApp";
    if (/googlequicksearchbox/.test(referent)) return "Google";
    return "Application Android";
  }
  let hote: string;
  try {
    hote = new URL(referent).hostname.toLowerCase();
  } catch {
    return null;
  }
  const sansPrefixe = (h: string) => h.replace(/^(www|m|l|lm|mobile)\./, "");
  if (!hote || sansPrefixe(hote) === sansPrefixe(hoteDuSite.toLowerCase())) return null;
  const propre = sansPrefixe(hote);
  for (const [motif, nom] of SITES_CONNUS) {
    if (motif.test(propre)) return nom;
  }
  return propre.slice(0, 100);
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Chemin sans paramètres ni identifiants : /dashboard/demandes/<uuid>
 *  devient /dashboard/demandes/[id]. Les pages se regroupent (sinon chaque
 *  projet serait « une page »), et aucun identifiant n'est conservé. */
export function cheminPropre(chemin: string | null | undefined): string | null {
  if (!chemin || typeof chemin !== "string" || !chemin.startsWith("/")) return null;
  const sansRequete = chemin.split(/[?#]/)[0];
  const propre = sansRequete
    .replace(UUID, "[id]")
    .replace(/\/\d+(?=\/|$)/g, "/[n]")
    .replace(/\/+$/, "");
  return (propre || "/").slice(0, 200);
}

/** Les pages qu'on ne mesure jamais : l'administration, et l'API. */
export function cheminExclu(chemin: string): boolean {
  return chemin.startsWith("/admin") || chemin.startsWith("/api");
}
