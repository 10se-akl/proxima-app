import type { MetadataRoute } from "next";

// Uniquement les pages publiques — pas /dashboard ni /admin (privés,
// exclus aussi de robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://compyo.vercel.app";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/demander-acces`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/politique-de-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cgu`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
