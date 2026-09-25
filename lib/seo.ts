import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// ============================================================
// Métadonnées des pages publiques (25/09).
//
// Avant, chaque page ne déclarait que `title` et `description`. Tout le
// reste était hérité de l'accueil (app/layout.tsx) : partager /comparatif
// sur WhatsApp affichait le titre et l'adresse de l'accueil, et aucune
// page intérieure n'avait d'adresse canonique. Une page qui déclare son
// propre `openGraph` perd aussi l'image de partage héritée : elle est donc
// redonnée ici, explicitement.
//
// Une seule fonction pour toutes les pages : titre, description, adresse
// canonique, aperçu de partage (Open Graph, X/Twitter), et indexation.
// ============================================================

const IMAGE_PARTAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Compyo — le compagnon administratif des artisans du bâtiment",
};

export function metaPage({
  titre,
  description,
  chemin,
  titreAbsolu = false,
  type = "website",
  indexer = true,
}: {
  /** Sans « — Compyo » : le gabarit du layout l'ajoute. */
  titre: string;
  description: string;
  /** Chemin de la page, qui devient son adresse canonique. */
  chemin: string;
  /** Titre déjà complet (l'accueil), à ne pas suffixer. */
  titreAbsolu?: boolean;
  type?: "website" | "article";
  /** false : hors des résultats de recherche, liens suivis. */
  indexer?: boolean;
}): Metadata {
  const titreComplet = titreAbsolu ? titre : `${titre} — Compyo`;
  return {
    title: titreAbsolu ? { absolute: titre } : titre,
    description,
    alternates: { canonical: chemin },
    openGraph: {
      type,
      locale: "fr_FR",
      siteName: "Compyo",
      url: chemin,
      title: titreComplet,
      description,
      images: [IMAGE_PARTAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: titreComplet,
      description,
      images: [IMAGE_PARTAGE.url],
    },
    ...(indexer ? {} : { robots: { index: false, follow: true } }),
  };
}

/** Le fil d'Ariane, pour les moteurs (BreadcrumbList). Le dernier élément
 *  est la page elle-même. */
export function filAriane(etapes: { nom: string; chemin: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: etapes.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nom,
      item: `${SITE_URL}${e.chemin === "/" ? "" : e.chemin}`,
    })),
  };
}

/** Une FAQ visible sur la page, décrite aussi pour les moteurs
 *  (FAQPage). Les questions balisées doivent être celles affichées, mot
 *  pour mot : une FAQ balisée mais absente de la page est trompeuse. */
export function faqPage(questions: readonly { question: string; reponse: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.reponse },
    })),
  };
}
