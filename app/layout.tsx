import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { InstallPWA } from "@/components/pwa/InstallPWA";
import { MiseAJourPWA } from "@/components/pwa/MiseAJourPWA";
import { EnregistrerServiceWorker } from "@/components/pwa/EnregistrerServiceWorker";
import { MesureAudience } from "@/components/MesureAudience";

const URL_SITE = SITE_URL;
const TITRE = "Compyo — L'assistant qui s'occupe de l'administratif des artisans";
const DESCRIPTION =
  "Compyo centralise vos clients, vos chantiers, vos photos, vos notes vocales et vos rendez-vous, et vous aide à préparer vos devis. Bêta privée pour les artisans du bâtiment.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: {
    default: TITRE,
    template: "%s — Compyo",
  },
  description: DESCRIPTION,
  keywords: [
    "logiciel artisan",
    "devis artisan bâtiment",
    "gestion chantier",
    "assistant IA artisan",
    "plombier chauffagiste logiciel",
    "facturation électronique artisan",
    "logiciel BTP tous corps de métier",
  ],
  authors: [{ name: "Compyo" }],
  robots: { index: true, follow: true },
  // Pas de champ "images" ici : app/opengraph-image.tsx est un fichier de
  // convention Next.js qui génère déjà automatiquement les balises
  // og:image et twitter:image — les redéclarer ici produirait deux
  // balises pour la même image, ce que certains outils de partage
  // (LinkedIn notamment) gèrent mal.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: URL_SITE,
    siteName: "Compyo",
    title: TITRE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITRE,
    description: DESCRIPTION,
  },
  // Icône iOS "écran d'accueil" — le favicon standard reste généré
  // dynamiquement par app/icon.tsx (convention Next.js déjà en place, non
  // touchée ici pour éviter deux déclarations concurrentes de <link
  // rel="icon">). iOS Safari, en revanche, ignore manifest.icons pour son
  // icône d'écran d'accueil : il lui faut explicitement ce
  // apple-touch-icon dédié, absent jusqu'ici du produit.
  icons: {
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  // "Ajouter à l'écran d'accueil" sur iOS ignore aussi manifest.display :
  // ces trois champs sont l'équivalent Apple de "standalone" + le nom
  // affiché sous l'icône + l'apparence de la barre de statut ("default"
  // = texte noir, cohérent avec notre fond crème clair par défaut).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Compyo",
  },
  // Empêche iOS/Android de proposer leur propre traduction automatique de
  // l'interface (l'app est nativement et exclusivement en français) et
  // désactive le format-detection qui transforme parfois des numéros de
  // devis ou des références en liens "appeler" cliquables involontaires.
  formatDetection: { telephone: false },
  // 24/09 — Chrome signale « apple-mobile-web-app-capable » (posé par
  // appleWebApp ci-dessus) comme obsolète et demande son équivalent
  // standard. Les deux cohabitent : iOS lit le premier, Chrome le second.
  other: { "mobile-web-app-capable": "yes" },
};

// Séparé de `metadata` depuis Next.js 14 (dépréciation de viewport dans
// l'objet Metadata). viewportFit "cover" est ce qui permet à l'app de
// dessiner réellement jusque sous l'encoche/la Dynamic Island et la barre
// home indicator, plutôt que de laisser des bandes noires — à condition
// que le CSS respecte ensuite les safe-area-inset-* (voir globals.css).
// theme_color en deux variantes claire/sombre : c'est ce qui teinte la
// barre de statut Android et le cadre de fenêtre, cohérent avec le mode
// sombre déjà présent dans l'app plutôt qu'une couleur fixe.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F5" },
    { media: "(prefers-color-scheme: dark)", color: "#1F2937" },
  ],
};

// Données structurées (schema.org, format JSON-LD) — pas pour les
// visiteurs humains, mais pour les moteurs de recherche ET les moteurs
// génératifs (ChatGPT, Perplexity, AI Overviews...) qui s'en servent pour
// comprendre sans ambiguïté ce qu'est Compyo, avant même de lire le texte
// de la page. Deux types combinés : "Organization" (l'éditeur) et
// "SoftwareApplication" (le produit) — description volontairement neutre
// et factuelle (bêta privée, pas de faux chiffres, pas de note inventée).
const DONNEES_STRUCTUREES = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${URL_SITE}/#organisation`,
      name: "Compyo",
      url: URL_SITE,
      logo: `${URL_SITE}/icon`,
      email: "proxima.saas@gmail.com",
      // Signal E-E-A-T (autorité/confiance) explicite : "qui est derrière
      // Compyo" revient constamment comme question de confiance (voir
      // /confiance, /a-propos) — un éditeur nommément identifié plutôt
      // qu'une structure floue est ce que les moteurs classiques ET
      // génératifs valorisent le plus pour ce type de question.
      founder: { "@id": `${URL_SITE}/#fondateur` },
      sameAs: [],
    },
    {
      "@type": "Person",
      "@id": `${URL_SITE}/#fondateur`,
      name: "Axel Thfoin",
      jobTitle: "Développeur indépendant",
      worksFor: { "@id": `${URL_SITE}/#organisation` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${URL_SITE}/#logiciel`,
      name: "Compyo",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: DESCRIPTION,
      url: URL_SITE,
      inLanguage: "fr-FR",
      audience: {
        "@type": "Audience",
        audienceType: "Artisans du bâtiment",
      },
      publisher: { "@id": `${URL_SITE}/#organisation` },
      // Pas de champ "offers"/"aggregateRating" : le produit est en bêta
      // privée sur candidature, sans tarif public ni avis clients réels —
      // en inventer ferait du contenu structuré trompeur, contre-productif
      // pour le SEO comme pour le GEO (les moteurs pénalisent les données
      // structurées qui ne correspondent pas à la page réelle).
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning (24/09) : le script anti-flash ci-dessous
    // pose la classe .dark sur <html> AVANT React. Sans cette mention,
    // React signalait à chaque chargement une différence d'attribut
    // « class » entre le serveur et le navigateur — attendue, et limitée
    // à cette seule balise (les enfants restent vérifiés normalement).
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* 20/09 — Capte l'installation PWA AVANT React. Chrome déclenche
            "beforeinstallprompt" très tôt pendant le chargement et ne le
            rejoue jamais : sans écouteur à cet instant, l'installation
            programmatique est perdue pour toute la visite. Un useEffect
            arrive trop tard sur un téléphone (React s'hydrate après), d'où
            le bouton "Installer Compyo" qui retombait sur les instructions
            manuelles alors que Chrome, lui, proposait bien l'installation
            dans son menu ⋮. Ce script doit donc rester en ligne et
            synchrone dans le <head> : ni next/script (même en
            beforeInteractive, la garantie est plus faible), ni defer/async.
            Il met l'événement de côté, lib/pwa/installPrompt.ts le
            récupère ensuite. Aucune dépendance, tout est en try/catch :
            dans le pire des cas il ne fait rien, et on retombe sur le
            comportement d'avant (instructions manuelles). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{' +
              'if(window.__compyoInstallPromptPose)return;' +
              'window.__compyoInstallPromptPose=1;' +
              'if(!("__compyoInstallPrompt" in window))window.__compyoInstallPrompt=null;' +
              'window.addEventListener("beforeinstallprompt",function(e){try{' +
              'e.preventDefault();' +
              'window.__compyoInstallPrompt=e;' +
              'window.dispatchEvent(new CustomEvent("compyo:install-prompt-pret"));' +
              '}catch(x){}});' +
              'window.addEventListener("appinstalled",function(){try{' +
              'window.__compyoInstallPrompt=null;' +
              '}catch(x){}});' +
              '}catch(e){}})();',
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES) }}
        />
        {/* Splash screens iOS : Safari ne génère jamais d'écran de démarrage
            tout seul (contrairement à Android) — il faut lui fournir une
            image par résolution exacte d'appareil, sélectionnée via une
            media query sur la taille physique de l'écran. Couvre les
            familles d'iPhone les plus courantes ; un modèle absent de
            cette liste retombe simplement sur un écran blanc bref plutôt
            que sur une erreur (dégradation silencieuse, sans risque). */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1290x2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1284x2778.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1179x2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1170x2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        {/* Préconnexion à Supabase (API + Auth) : sur la quasi-totalité des
            pages de l'app, le premier appel réseau utile est une requête
            Supabase — établir la connexion TLS en parallèle du reste du
            chargement, plutôt que d'attendre que le JS s'exécute pour la
            découvrir, fait gagner l'équivalent d'un aller-retour réseau
            (notable sur une connexion de chantier). NEXT_PUBLIC_SUPABASE_URL
            est déjà exposé au client (utilisé par lib/supabase/client.ts),
            donc sans risque à afficher ici. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="" />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* fonts.gstatic.com sert les fichiers de police eux-mêmes (le
            domaine ci-dessus ne sert que le CSS qui les référence) —
            manquait jusqu'ici, ce qui retardait silencieusement le
            chargement des polices d'un aller-retour DNS+TLS supplémentaire
            à chaque première visite. crossOrigin requis car les polices
            sont chargées en mode CORS. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Applique la classe .dark AVANT le premier rendu React, en
            bloquant (script synchrone, pas de "defer"/"async") — sans ça,
            la page peinturait d'abord en clair puis basculerait en sombre
            une fois React hydraté, un flash bref mais désagréable à
            chaque chargement pour un utilisateur en mode sombre.
            Mode sombre PAR DÉFAUT : on active .dark sauf si l'utilisateur a
            explicitement choisi le mode clair via ThemeToggle (valeur "0"
            en storage) — un visiteur qui n'a jamais touché au bouton
            démarre donc en sombre, pas en clair. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("compyo-mode-sombre")!=="0"){document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-paper text-ink antialiased font-sans">
        {children}
        {/* Trois briques PWA volontairement indépendantes du reste de
            l'app (voir components/pwa/) : chacune ne rend rien tant que
            sa condition n'est pas réunie (SW compatible, prompt
            disponible, mise à jour détectée), donc strictement neutre
            pour tout visiteur du site vitrine ou navigateur non
            compatible — voir le rapport de cycle pour le détail de la
            stratégie de cache et du parcours d'installation. */}
        <EnregistrerServiceWorker />
        <InstallPWA />
        <MiseAJourPWA />
        {/* Mesure d'audience maison, sans cookie (Module 44) — voir
            components/MesureAudience.tsx et app/api/visite/route.ts. */}
        <MesureAudience />
      </body>
    </html>
  );
}
