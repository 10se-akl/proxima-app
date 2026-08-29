// ============================================================
// Notifications push — activé (29/08, voir Module 27bis, supabase/
// schema.sql, et lib/notifications/push.ts côté serveur).
//
// Philosophie Compyo (brief Axel, 29/08) : une notification ne part que
// dans deux cas — (1) l'artisan a lui-même programmé un rappel sur une
// note, (2) un événement système vraiment critique (hors périmètre ici).
// JAMAIS de rappel automatique de rendez-vous, de devis ou autre. C'est
// pour ça que demanderAbonnementSiNecessaire() ci-dessous n'est appelée
// QUE depuis components/notes/FormulaireNote.tsx, au moment précis où
// l'artisan programme un premier rappel — jamais au chargement de l'app.
// ============================================================

export type EtatPermissionNotifications = "non-supporte" | "defaut" | "accordee" | "refusee";

export function lireEtatPermissionNotifications(): EtatPermissionNotifications {
  if (typeof window === "undefined" || !("Notification" in window)) return "non-supporte";
  if (Notification.permission === "granted") return "accordee";
  if (Notification.permission === "denied") return "refusee";
  return "defaut";
}

// Demande la permission navigateur — DOIT être appelée depuis un geste
// utilisateur explicite (clic sur un bouton dédié dans les Paramètres,
// jamais au chargement d'une page) : un navigateur qui reçoit cette
// demande sans interaction directe l'ignore silencieusement ou grille la
// seule chance de la proposer plus tard sur certains navigateurs.
export async function demanderPermissionNotifications(): Promise<EtatPermissionNotifications> {
  if (typeof window === "undefined" || !("Notification" in window)) return "non-supporte";
  const resultat = await Notification.requestPermission();
  return resultat === "granted" ? "accordee" : resultat === "denied" ? "refusee" : "defaut";
}

// Récupère (ou crée) l'abonnement push du navigateur courant, prêt à être
// envoyé à une future route API pour être stocké côté serveur. Retourne
// `null` si les prérequis ne sont pas réunis (pas de clé VAPID configurée,
// service worker non prêt) plutôt que de lever une erreur — cette
// fonction n'étant appelée par rien pour l'instant, une erreur silencieuse
// est le comportement le plus sûr par défaut.
export async function sAbonnerNotificationsPush(): Promise<PushSubscription | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  const clePublique = process.env.NEXT_PUBLIC_VAPID_CLE_PUBLIQUE;
  if (!clePublique) return null;

  const enregistrement = await navigator.serviceWorker.ready;
  const abonnementExistant = await enregistrement.pushManager.getSubscription();
  if (abonnementExistant) return abonnementExistant;

  return enregistrement.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: clePublique,
  });
}

// Sérialise un PushSubscription pour l'envoyer à /api/notifications/abonner
// — l'objet natif du navigateur n'est pas directement JSON-sérialisable
// (getKey() retourne des ArrayBuffer), donc on extrait ce dont le serveur
// a besoin plutôt que de passer l'objet brut.
function serialiserAbonnement(abonnement: PushSubscription) {
  const cleP256dh = abonnement.getKey("p256dh");
  const cleAuth = abonnement.getKey("auth");
  return {
    endpoint: abonnement.endpoint,
    cleP256dh: cleP256dh ? btoa(String.fromCharCode(...new Uint8Array(cleP256dh))) : "",
    cleAuth: cleAuth ? btoa(String.fromCharCode(...new Uint8Array(cleAuth))) : "",
  };
}

// Point d'entrée UNIQUE pour demander la permission ET enregistrer
// l'abonnement côté serveur — appelée uniquement au moment où l'artisan
// programme un rappel sur une note (jamais au chargement de l'app, voir
// commentaire en tête de fichier). Retourne true si l'artisan a bien un
// abonnement actif à l'issue de l'appel (permission déjà accordée avant,
// ou tout juste accordée), false sinon — permet à l'appelant d'afficher
// un message adapté sans dupliquer cette logique.
export async function demanderAbonnementSiNecessaire(): Promise<boolean> {
  const etatActuel = lireEtatPermissionNotifications();
  if (etatActuel === "non-supporte" || etatActuel === "refusee") return false;

  const etat =
    etatActuel === "accordee" ? etatActuel : await demanderPermissionNotifications();
  if (etat !== "accordee") return false;

  try {
    const abonnement = await sAbonnerNotificationsPush();
    if (!abonnement) return false;

    await fetch("/api/notifications/abonner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serialiserAbonnement(abonnement)),
    });
    return true;
  } catch {
    // Échec réseau/navigateur : la note elle-même reste enregistrée avec
    // son rappel (voir FormulaireNote.tsx) — seule la notification push
    // ne partira pas, jamais bloquant pour l'action principale.
    return false;
  }
}
