import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { FICHES_REDIGEES } from "@/lib/metiersPages";

// Uniquement les pages publiques — pas /dashboard ni /admin (privés,
// exclus aussi de robots.ts), ni les pages de connexion (en noindex).
//
// Les pages métier ne sont ici QUE si leur contenu est écrit (voir
// lib/metiersPages.ts) : depuis le 25/09, les dix-huit.
//
// `lastModified` : la date de la dernière vraie modification du contenu
// de la page, pas la date du déploiement — une date qui change à chaque
// mise en ligne est ignorée par les moteurs. À mettre à jour à la main
// quand le texte d'une page change.
const MAJ_25_09 = "2026-09-25";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  return [
    { url: base, lastModified: MAJ_25_09, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/metiers`, lastModified: MAJ_25_09, changeFrequency: "monthly", priority: 0.9 },
    ...FICHES_REDIGEES.map((f) => ({
      url: `${base}/metiers/${f.slug}`,
      lastModified: MAJ_25_09,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${base}/fonctionnalites`, lastModified: MAJ_25_09, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/questions-frequentes`, lastModified: MAJ_25_09, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/comment-ca-fonctionne`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/comparatif`, lastModified: MAJ_25_09, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/confiance`, lastModified: MAJ_25_09, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/pourquoi-compyo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/beta`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/demander-acces`, lastModified: MAJ_25_09, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/carte-mentale`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/a-propos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/politique-de-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cgu`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
