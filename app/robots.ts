import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// L'espace privé (/dashboard, /admin) ne doit jamais être indexé — seule
// la vitrine publique a vocation à apparaître dans les résultats de
// recherche.
//
// 25/09 — Les robots des moteurs ET des assistants IA sont les bienvenus
// sur la vitrine : Googlebot, Bingbot (qui alimente aussi Copilot,
// DuckDuckGo et la recherche de ChatGPT), OAI-SearchBot et GPTBot
// (OpenAI), PerplexityBot, ClaudeBot et Claude-SearchBot (Anthropic),
// Google-Extended (Gemini), Applebot. La règle « * » les couvre tous :
// aucune n'est listée à part, pour qu'aucune ne diverge par oubli. Pour
// en exclure un un jour, ajouter une règle à son nom.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // "/devis" : liens publics de consultation/signature d'un devis
      // précis (voir Module 31) — jamais destinés à être indexés, chaque
      // page contient le nom et les montants d'un client.
      // "/api/" : des réponses techniques, rien à lire pour un moteur.
      disallow: ["/dashboard", "/admin", "/devis", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
