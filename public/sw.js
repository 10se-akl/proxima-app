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

// v2 (05/09, audit sécurité) : force l'invalidation de TOUT cache v1 déjà
// installé chez les artisans — voir le correctif ci-dessous sur les pages
// /dashboard/*, qui pouvaient jusqu'ici finir dans CACHE_PAGES avec de
// vraies données d'organisation (noms clients, montants de devis...). Un
// simple changement de logique ne suffit pas à purger ce qui est déjà
// stocké sur les appareils existants — seul un changement de nom de cache
// déclenche le ménage déjà en place dans l'event "activate" ci-dessous.
const VERSION_CACHE = "compyo-v2";
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

// Audit pré-bêta (09/09), point 🔴 n°2 — compression du partage natif
// Android AVANT que la requête ne quitte l'appareil.
//
// Rappel du problème : le partage natif (WhatsApp/Galerie → Partager →
// Compyo, voir app/manifest.ts "share_target" et app/api/partage/
// route.ts) est un vrai POST HTML fait par l'OS/Chrome, pas un fetch()
// piloté par notre JS de page — impossible à intercepter ou compresser
// depuis une page normale. Vercel refuse tout corps de requête au-delà de
// 4,5 Mo AVANT même que notre route ne s'exécute (limite d'infrastructure,
// non contournable depuis le code applicatif), donc une photo un peu
// lourde faisait échouer tout le partage sans qu'aucun code à nous ne
// puisse réagir.
//
// Le service worker, lui, intercepte bien CETTE requête via son event
// "fetch" (les Service Workers reçoivent tous les fetch, POST compris —
// seule LA LOGIQUE ci-dessous choisit de les ignorer d'habitude, voir plus
// bas). C'est donc le SEUL endroit du code où une compression avant envoi
// est techniquement possible sur ce parcours précis.
//
// Exception volontaire et étroite à la règle de fond du fichier ("jamais
// intercepter /api/*") : ce bloc ne met JAMAIS rien en cache, ne lit ni ne
// modifie aucune donnée métier, et transmet la requête (avec les photos
// éventuellement redimensionnées) au MÊME endpoint /api/partage, qui
// applique exactement la même authentification et les mêmes policies RLS
// qu'avant — cette étape ne fait que réduire le poids du corps envoyé sur
// le réseau, rien d'autre.
const CIBLE_PARTAGE = "/api/partage";
// Cible volontairement bien en dessous des 4,5 Mo Vercel : un partage peut
// contenir plusieurs photos (voir getAll("fichiers") côté route), donc
// chaque image doit laisser de la marge aux autres.
const TAILLE_CIBLE_PHOTO_PARTAGE = 900 * 1024;
const LARGEUR_MAX_PHOTO_PARTAGE = 1600;

// Redimensionne et recompresse une image trop lourde via OffscreenCanvas
// (disponible dans un service worker, contrairement à <canvas> classique).
// Deux passes maximum : la plupart des photos de téléphone (JPEG, quelques
// Mo) tiennent dès la première ; une photo particulièrement détaillée a une
// seconde chance, plus agressive, avant d'abandonner et de renvoyer le
// fichier tel quel (mieux vaut retenter l'envoi brut, comme avant ce
// correctif, que de bloquer tout le partage sur une erreur de compression).
async function compresserPhotoPartage(fichier) {
  if (!fichier.type || !fichier.type.startsWith("image/")) return fichier;
  if (fichier.size <= TAILLE_CIBLE_PHOTO_PARTAGE) return fichier;

  const passes = [
    { largeur: LARGEUR_MAX_PHOTO_PARTAGE, qualite: 0.72 },
    { largeur: 1000, qualite: 0.55 },
  ];

  try {
    const bitmap = await createImageBitmap(fichier);
    let resultat = fichier;
    for (const passe of passes) {
      const ratio = Math.min(1, passe.largeur / bitmap.width);
      const largeur = Math.max(1, Math.round(bitmap.width * ratio));
      const hauteur = Math.max(1, Math.round(bitmap.height * ratio));
      const canvas = new OffscreenCanvas(largeur, hauteur);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: passe.qualite });
      resultat = new File(
        [blob],
        fichier.name.replace(/\.\w+$/, "") + ".jpg",
        { type: "image/jpeg" }
      );
      if (resultat.size <= TAILLE_CIBLE_PHOTO_PARTAGE) break;
    }
    bitmap.close?.();
    return resultat;
  } catch {
    // Format non décodable ici (HEIC non converti, fichier corrompu...) :
    // best-effort, on retente l'envoi tel quel plutôt que de perdre le
    // partage — au pire, même résultat qu'avant ce correctif.
    return fichier;
  }
}

async function gererPartageEntrant(requete) {
  const requeteBrute = requete.clone();
  try {
    const donneesOrigine = await requete.formData();
    const nouvellesDonnees = new FormData();
    for (const [cle, valeur] of donneesOrigine.entries()) {
      if (cle === "fichiers" && valeur instanceof File) {
        nouvellesDonnees.append("fichiers", await compresserPhotoPartage(valeur));
      } else {
        nouvellesDonnees.append(cle, valeur);
      }
    }
    // Auto-relecture (09/09) — "redirect: manual" est INDISPENSABLE ici :
    // app/api/partage/route.ts répond TOUJOURS par une redirection 303
    // (succès comme échec). Sans ce réglage, ce fetch() suivrait la
    // redirection tout seul et la renverrait comme une réponse 200 déjà
    // résolue — la barre d'adresse du navigateur resterait alors bloquée
    // sur /api/partage au lieu de la vraie page de revue, et un
    // rechargement de cette page échouerait (cette route n'a pas de
    // handler GET). En renvoyant la redirection "opaque" telle quelle à
    // event.respondWith(), c'est le NAVIGATEUR lui-même qui effectue la
    // navigation vers l'URL finale, exactement comme sans service worker.
    const reponse = await fetch(CIBLE_PARTAGE, {
      method: "POST",
      body: nouvellesDonnees,
      redirect: "manual",
    });
    return reponseAvecReplisSiRejet(reponse);
  } catch {
    // Lecture/compression impossible : on retente l'envoi brut plutôt que
    // d'afficher une erreur du service worker lui-même — app/api/partage/
    // route.ts gère déjà un form-data illisible proprement (voir son
    // try/catch), et un échec Vercel 413 reste, dans le pire des cas,
    // identique à avant ce correctif. Même raison ci-dessus pour
    // "redirect: manual".
    const reponseBrute = await fetch(requeteBrute, { redirect: "manual" });
    return reponseAvecReplisSiRejet(reponseBrute);
  }
}

// Vérification (11/09) — la compression ci-dessus est best-effort : sur un
// navigateur sans OffscreenCanvas, ou avec assez de photos partagées d'un
// coup, la requête peut ENCORE dépasser la limite de taille de
// l'hébergeur. Ce rejet se produit avant que app/api/partage/route.ts ne
// s'exécute : aucune redirection propre n'est alors renvoyée, et l'artisan
// se retrouve devant une page d'erreur brute illisible, sans rien pour
// continuer. On traduit ce cas dans la même convention d'erreur que le
// reste du parcours (voir MESSAGES_ERREUR_PARTAGE dans app/dashboard/
// demandes/nouvelle/page.tsx) : un message clair + le formulaire manuel
// comme porte de sortie immédiate.
//
// Une redirection (type "opaqueredirect" à cause de redirect:"manual") a un
// status de 0 : c'est le cas NORMAL de succès ici, à ne surtout pas
// confondre avec une erreur.
function reponseAvecReplisSiRejet(reponse) {
  if (reponse.type === "opaqueredirect" || reponse.status < 400) {
    return reponse;
  }
  const cle = reponse.status === 413 ? "partage_trop_lourd" : "partage_echec_serveur";
  // URL ABSOLUE obligatoire : Response.redirect() lève une TypeError sur un
  // chemin relatif — ce qui, ici, transformerait le message d'erreur qu'on
  // essaie d'afficher en plantage du service worker lui-même.
  const destination = new URL(`/dashboard/demandes/nouvelle?erreur=${cle}`, self.location.origin);
  return Response.redirect(destination.toString(), 303);
}

function estApiOuSupabase(url) {
  if (url.pathname.startsWith("/api/")) return true;
  // Tout domaine Supabase (API + Storage) ne doit jamais être mis en
  // cache : données organisationnelles, photos avec URL signées à durée
  // de vie courte, etc.
  if (url.hostname.endsWith(".supabase.co")) return true;
  return false;
}

// Audit sécurité (05/09) : /dashboard/* est rendu côté serveur avec de
// vraies données d'organisation (noms clients, adresses, montants de
// devis...) — voir app/dashboard/page.tsx, demandes/page.tsx, devis/
// page.tsx, planning/page.tsx (Server Components). La stratégie
// "network-first" ci-dessous écrivait quand même chaque réponse réussie
// dans CACHE_PAGES, donc ces données finissaient dans le Cache Storage du
// navigateur — jamais purgées à la déconnexion (voir Sidebar.tsx). Sur un
// appareil partagé, un visiteur suivant (ou un artisan d'une autre
// organisation, appareil revendu/prêté) pouvait les retrouver, y compris
// hors-ligne. /admin est logé à la même enseigne (déjà exclu du
// référencement, aucune valeur hors-ligne pour Axel non plus). Ces pages
// sont désormais réseau-uniquement, jamais écrites en cache — voir
// reponseReseauSansCache plus bas.
function estPageProtegee(url) {
  return url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin");
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

// Réseau uniquement, jamais de cache.put() — voir estPageProtegee ci-dessus.
// En cas d'échec réseau, retombe sur la page hors-ligne générique plutôt
// que sur une copie mise en cache de la page privée (qui n'existe plus).
async function reponseReseauSansCache(requete) {
  try {
    return await fetch(requete);
  } catch {
    const cache = await caches.open(CACHE_STATIQUE);
    return cache.match(PAGE_HORS_LIGNE);
  }
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

  // Exception étroite et documentée en tête de fichier (voir
  // gererPartageEntrant plus haut) : SEULE cette requête POST précise est
  // interceptée, uniquement pour compresser une photo trop lourde avant
  // qu'elle ne quitte l'appareil — jamais de cache, jamais d'autre route.
  if (requete.method === "POST" && new URL(requete.url).pathname === CIBLE_PARTAGE) {
    event.respondWith(gererPartageEntrant(requete));
    return;
  }

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
    if (estPageProtegee(url)) {
      event.respondWith(reponseReseauSansCache(requete));
      return;
    }
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

  // Audit sécurité (05/09) : ce bloc attrape aussi les requêtes de
  // prefetch/RSC que Next.js émet en arrière-plan pour /dashboard/* (mode
  // "cors", pas "navigate") — même exclusion que la navigation ci-dessus,
  // sinon le payload React Server Component (qui contient les mêmes
  // données d'organisation sérialisées) se serait juste caché ailleurs.
  if (estPageProtegee(url)) {
    event.respondWith(reponseReseauSansCache(requete));
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
