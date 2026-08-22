import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

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
      sameAs: [],
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
    <html lang="fr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
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
      </body>
    </html>
  );
}
