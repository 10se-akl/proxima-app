// ============================================================
// Service worker Compyo — stratégie de cache réfléchie, pas un simple
// "cache tout". Enregistré par components/pwa/EnregistrerServiceWorker.tsx.
//
// Fichier statique (pas de build/bundler dessus) : volontairement écrit
// en JS simple, sans dépendance externe (pas de Workbox) pour rester
// entièrement lisible et sans boîte noire — cohérent avec la taille du
// produit à ce stade.
//
// RÈGLE DE FOND, à ne jamais casser en le modifiant plus tard : ce
// service worker ne doit JAMAIS intercepter ni mettre en cache une
// requête vers /api/*, ni vers Supabase (données client, devis, photos
// signées). Un devis ou un statut de projet caché par erreur et resservi
// périmé serait bien pire qu'une erreur réseau franche. Seuls la coquille
// de l'application (HTML, JS, CSS, polices, icônes) sont concernés.
//
// STRATÉGIE PAR TYPE DE RESSOURCE :
//
// 1. Navigation (l'artisan ouvre/recharge une page) : "network first".
//    On tente toujours le réseau en premier (les données doivent être
//    fraîches), on retombe sur la dernière version mise en cache de
//    CETTE page si le réseau échoue, et si cette page n'a jamais été
//    visitée, sur /hors-ligne (page de secours statique, voir
//    app/hors-ligne/page.tsx) plutôt qu'une erreur de navigateur brute.
//    Conséquence concrète pour un artisan qui perd le réseau en plein
//    chantier : les projets déjà ouverts récemment restent consultables
//    (fiche, notes, historique) ; un projet jamais ouvert avant la
//    coupure réseau, lui, ne peut pas apparaître par magie — on l'annonce
//    clairement plutôt que de laisser une page blanche.
//
// 2. Fichiers statiques versionnés par Next.js (_next/static/*) : "stale
//    while revalidate". Ces fichiers sont adressés par un hash dans leur
//    nom (immuables par construction : un même nom = un même contenu
//    pour toujours), donc les servir depuis le cache est toujours sûr, et
//    on les rafraîchit quand même en tâche de fond pour capter les
//    prochains déploiements sans jamais bloquer l'affichage en attendant
//    le réseau.
//
// 3. Icônes, splash screens, polices (/icons/*, /splash/*, Google Fonts) :
//    "cache first" — ce sont des images/polices de marque qui ne changent
//    quasiment jamais, inutile de revalider à chaque fois.
//
// 4. Notes vocales, photos, tout ce qui part vers /api/* ou vers un
//    domaine Supabase : JAMAIS intercepté. La ligne "if (estApiOuSupabase)
//    return" plus bas s'en assure explicitement.
//
// CE QUE CE SERVICE WORKER NE FAIT PAS (volontairement, à ce stade) :
// il ne met en file d'attente aucune écriture faite hors ligne (nouvelle
// note vocale, nouveau projet, devis modifié) pour la rejouer au retour
// du réseau. Construire une vraie synchronisation différée fiable est un
// chantier à part entière, avec un risque réel de corruption ou de perte
// silencieuse si elle est mal faite — plus dangereux qu'utile si elle est
// ajoutée à la hâte. Voir le rapport de cycle pour le détail : c'est un
// chantier volontairement laissé pour une itération dédiée, pas oublié.
// ============================================================

const VERSION_CACHE = "compyo-v1";
const CACHE_STATIQUE = `${VERSION_CACHE}-statique`;
const CACHE_PAGES = `${VERSION_CACHE}-pages`;
const PAGE_HORS_LIGNE = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIQUE);
      // Liste volontairement courte : on ne peut pas connaître à l'avance
      // les noms de fichiers hashés générés par le build Next.js (pas de
      // build exécuté depuis ce service worker statique). Le reste des
      // ressources _next/static/* est mis en cache au fur et à mesure
      // qu'elles sont réellement demandées (voir stratégie n°2 ci-dessus),
      // pas précaché en bloc ici.
      await cache.addAll([PAGE_HORS_LIGNE, "/manifest.webmanifest"]);
      // Passe immédiatement en état "waiting" -> activation contrôlée par
      // components/pwa/MiseAJourPWA.tsx (l'artisan valide la mise à jour
      // via "Mettre à jour", pas de bascule brutale en plein milieu d'une
      // saisie de devis).
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Ménage : supprime les caches des versions précédentes du service
      // worker (autre valeur de VERSION_CACHE), pour ne jamais laisser
      // grossir indéfiniment le stockage du téléphone de l'artisan.
      const noms = await caches.keys();
      await Promise.all(
        noms
          .filter((nom) => nom.startsWith("compyo-") && !nom.startsWith(VERSION_CACHE))
          .map((nom) => caches.delete(nom))
      );
      await self.clients.claim();
    })()
  );
});

// Reçoit l'ordre "passer en actif" envoyé par MiseAJourPWA.tsx quand
// l'artisan clique sur "Mettre à jour" — sans ça, un nouveau service
// worker resterait en attente jusqu'à la fermeture complète de tous les
// onglets Compyo, ce qui n'arrive presque jamais sur mobile.
self.addEventListener("message", (event) => {
  if (event.data === "COMPYO_ACTIVER_NOUVELLE_VERSION") {
    self.skipWaiting();
  }
});

function estApiOuSupabase(url) {
  if (url.pathname.startsWith("/api/")) return true;
  // Tout domaine Supabase (API + Storage) ne doit jamais être mis en
  // cache : données organisationnelles, photos avec URL signées à durée
  // de vie courte, etc.
  if (url.hostname.endsWith(".supabase.co")) return true;
  return false;
}

function estRessourceStatiqueImmuable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  );
}

async function reponseReseauPuisCache(requete, cache) {
  try {
    const reponse = await fetch(requete);
    // Seules les réponses valides sont mises en cache — une erreur 4xx/5xx
    // ne doit jamais écraser une bonne version précédemment enregistrée.
    if (reponse && reponse.ok) {
      cache.put(requete, reponse.clone());
    }
    return reponse;
  } catch {
    const correspondance = await cache.match(requete);
    if (correspondance) return correspondance;
    return cache.match(PAGE_HORS_LIGNE);
  }
}

async function reponseCachePuisRevalidation(requete, cache) {
  const correspondance = await cache.match(requete);
  const misAJour = fetch(requete)
    .then((reponse) => {
      if (reponse && reponse.ok) cache.put(requete, reponse.clone());
      return reponse;
    })
    .catch(() => undefined);
  // On répond immédiatement avec la version en cache si elle existe (pas
  // d'attente réseau visible pour l'artisan), tout en laissant la requête
  // réseau se terminer en tâche de fond pour la prochaine visite.
  return correspondance || misAJour;
}

async function reponseCacheDabord(requete, cache) {
  const correspondance = await cache.match(requete);
  if (correspondance) return correspondance;
  const reponse = await fetch(requete);
  if (reponse && reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}

// ============================================================
// SCAFFOLDING notifications push — volontairement inerte pour l'instant.
// Rien n'envoie encore de notification côté serveur (pas d'abonnement
// stocké, pas de clé VAPID configurée) : ces deux handlers ne servent
// qu'à ce que le SQUELETTE soit déjà en place et testé quand la décision
// sera prise d'activer réellement les notifications, plutôt que de
// découvrir à ce moment-là des trous dans le cycle de vie du service
// worker. Voir lib/pwa/notifications.ts côté client pour le pendant
// "demander la permission" — lui aussi non appelé pour l'instant.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let donnees;
  try {
    donnees = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(donnees.titre || "Compyo", {
      body: donnees.corps || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: donnees.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((listeClients) => {
        const dejaOuvert = listeClients.find((c) => c.url.includes(cible));
        if (dejaOuvert) return dejaOuvert.focus();
        return self.clients.openWindow(cible);
      })
  );
});

self.addEventListener("fetch", (event) => {
  const requete = event.request;

  // On ne touche jamais aux méthodes qui modifient des données (POST,
  // PUT, PATCH, DELETE) : la Cache API ne sait de toute façon caching
  // que des GET, mais on le rend explicite plutôt que de laisser le
  // comportement par défaut faire foi silencieusement.
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);

  // Jamais d'interception pour l'API applicative ou Supabase — voir la
  // règle de fond en tête de fichier.
  if (estApiOuSupabase(url)) return;

  // Cross-origin non listé explicitement ci-dessus (ex. Sentry, Vercel
  // Analytics si ajoutés un jour) : on laisse filer tel quel plutôt que
  // de risquer de mettre en cache un service tiers pas prévu pour ça.
  if (url.origin !== self.location.origin && !estRessourceStatiqueImmuable(url)) return;

  if (requete.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_PAGES);
        return reponseReseauPuisCache(requete, cache);
      })()
    );
    return;
  }

  if (estRessourceStatiqueImmuable(url)) {
    const strategie = url.pathname.startsWith("/_next/static/")
      ? reponseCachePuisRevalidation
      : reponseCacheDabord;
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_STATIQUE);
        return strategie(requete, cache);
      })()
    );
    return;
  }

  // Tout le reste (autres GET same-origin non classés ci-dessus) :
  // network-first avec repli cache, la même logique sûre que pour une
  // navigation — jamais de "cache first" par défaut sur une ressource
  // qu'on n'a pas explicitement identifiée comme immuable.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_PAGES);
      return reponseReseauPuisCache(requete, cache);
    })()
  );
});
