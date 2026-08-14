import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

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
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
