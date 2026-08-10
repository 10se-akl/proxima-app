import type { MetadataRoute } from "next";

// L'espace privé (/dashboard, /admin) ne doit jamais être indexé — seule
// la vitrine publique a vocation à apparaître dans les résultats de
// recherche.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin"],
    },
    sitemap: "https://compyo.vercel.app/sitemap.xml",
  };
}
