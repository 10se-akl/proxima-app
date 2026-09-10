// ============================================================
// Audit "vérification systématique" (10/09) — trouvé par un agent de
// recherche pendant la chasse aux bugs de nombres/dates : app/dashboard/
// bilan/page.tsx construit ses bornes de mois avec `new Date(annee, mois,
// 1)` (heure LOCALE au moment de l'exécution) puis `.toISOString()`.
// "Locale" pour un Server Component qui tourne sur Vercel, c'est le fuseau
// du SERVEUR (UTC par défaut, jamais garanti Europe/Paris) — pas celui de
// l'artisan. Une facture payée entre 22h et minuit heure de Paris, près
// d'une fin de mois, pouvait donc être comptée dans le mauvais mois.
//
// Plutôt que de corriger ce seul fichier avec un calcul de fuseau horaire
// fait à la main, on fixe le problème à la racine : `register()` est
// l'endroit officiellement documenté par Next.js pour exécuter du code
// UNE SEULE FOIS au démarrage du serveur, avant toute requête — en
// développement comme sur Vercel. Fixer process.env.TZ ici rend TOUTES
// les méthodes "locales" de Date (`new Date(y, m, d)`, `.setHours(0,0,0,0)`,
// `.getHours()`, `.toLocaleDateString()` sans timeZone explicite...) déjà
// utilisées un peu partout dans l'app (bilan mensuel, "aujourd'hui" sur le
// dashboard, semaine affichée du planning...) correctement alignées sur
// l'heure de Paris — un seul endroit à maintenir, pas un correctif par
// fichier, et ça protège aussi tout code futur qui ferait la même
// supposition implicite.
// ============================================================
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "Europe/Paris";
  }
}
