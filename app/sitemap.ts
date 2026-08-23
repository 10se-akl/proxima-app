import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Uniquement les pages publiques — pas /dashboard ni /admin (privés,
// exclus aussi de robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/fonctionnalites`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/comment-ca-fonctionne`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/pourquoi-compyo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/carte-mentale`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/beta`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/a-propos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/demander-acces`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/politique-de-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cgu`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
