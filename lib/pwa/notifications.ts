// ============================================================
// Scaffolding notifications push — préparé mais NON activé.
//
// Rien dans l'app n'appelle ces fonctions aujourd'hui. Elles existent
// pour que le jour où Axel décide d'activer réellement les notifications
// (ex. rappel de rendez-vous, devis accepté par un client), l'architecture
// soit déjà posée, réfléchie et prête à brancher plutôt qu'à improviser
// dans l'urgence — conformément à la demande de préparer sans développer.
//
// Ce qu'il manquera pour activer réellement l'envoi (à faire dans un
// cycle dédié, volontairement pas fait ici) :
// 1. Générer une paire de clés VAPID (`npx web-push generate-vapid-keys`)
//    et les stocker en variables d'environnement :
//    NEXT_PUBLIC_VAPID_CLE_PUBLIQUE (exposée au client) et
//    VAPID_CLE_PRIVEE (serveur uniquement, jamais exposée).
// 2. Une table Supabase `abonnements_push` (organisation_id, artisan_id,
//    endpoint, clés p256dh/auth, created_at) avec RLS identique au reste
//    du produit (un artisan ne voit que ses propres abonnements).
// 3. Une route API (ex. /api/notifications/abonner) qui reçoit
//    l'abonnement retourné par s'abonnerNotificationsPush() ci-dessous et
//    l'enregistre.
// 4. Un envoi serveur (librairie `web-push`) déclenché aux moments
//    identifiés comme utiles par l'étude produit — jamais en spam, un
//    artisan qui installe une PWA pro attend des alertes rares et
//    justifiées (rappel de RDV le matin même, devis accepté), pas une
//    notification à chaque micro-événement.
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
