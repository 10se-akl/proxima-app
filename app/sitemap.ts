import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { FICHES_REDIGEES } from "@/lib/metiersPages";

// Uniquement les pages publiques — pas /dashboard ni /admin (privés,
// exclus aussi de robots.ts).
//
// 20/09 — Les pages métier ne sont ici QUE si leur contenu est écrit
// (voir lib/metiersPages.ts). Les quinze autres existent mais restent
// hors sitemap et en noindex : déclarer quinze pages quasi identiques
// ferait baisser tout le domaine, pas seulement ces pages-là.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/fonctionnalites`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/comment-ca-fonctionne`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/pourquoi-compyo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/comparatif`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/confiance`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/carte-mentale`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/beta`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/a-propos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/demander-acces`, changeFrequency: "monthly", priority: 0.8 },
    ...FICHES_REDIGEES.map((f) => ({
      url: `${base}/metiers/${f.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/politique-de-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cgu`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
