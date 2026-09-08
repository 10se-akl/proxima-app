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
      // "/devis" : liens publics de consultation/signature d'un devis
      // précis (voir Module 31) — jamais destinés à être indexés, chaque
      // page contient le nom et les montants d'un client.
      disallow: ["/dashboard", "/admin", "/devis"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
