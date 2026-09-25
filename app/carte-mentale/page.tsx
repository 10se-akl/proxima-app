import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/Cadre";
import { CarteMentale } from "@/components/carte-mentale/CarteMentale";
import { CATEGORIES } from "@/lib/retours/taxonomie";

// 25/09 — metaPage : adresse canonique et aperçu de partage propres à
// la page (avant, ils étaient hérités de l'accueil). Voir lib/seo.ts.
export const metadata: Metadata = metaPage({
  titre: "Carte mentale",
  description:
    "Les grands thèmes remontés par les artisans qui utilisent Compyo, regroupés automatiquement par IA — sans jamais révéler qui a dit quoi.",
  chemin: "/carte-mentale",
});

// ============================================================
// Refonte "Retours produit" → carte mentale (Module 16, voir
// supabase/schema.sql). Page publique — volontairement pas cachée derrière
// une connexion, contrairement à l'ancienne /dashboard/retours : Axel veut
// que ce soit une vitrine de transparence ("vous construisez Compyo avec
// nous"), pas seulement un outil interne. Seul le vote/l'envoi d'un
// nouveau retour exige d'être connecté (voir CarteMentale.tsx).
//
// estAdmin calculé ICI, côté serveur, avant tout envoi au navigateur —
// jamais fait dans le composant client lui-même — puis simplement passé en
// prop : CarteMentale.tsx ne charge le détail nominatif
// (app/api/admin/retours) que si cette prop vaut true, et cette route
// vérifie de toute façon à nouveau process.env.ADMIN_EMAIL côté serveur
// (défense en profondeur, un client ne peut pas mentir sur ce prop pour
// obtenir le détail nominatif).
// ============================================================

export default async function CarteMentalePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const estAdmin = Boolean(user && user.email === process.env.ADMIN_EMAIL);

  return (
    <div>
      <Header />

      <div className="bg-paper">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-16 pb-8 sm:pt-24 sm:pb-10 text-center">
          <Reveal>
            <SectionLabel>Vous construisez Compyo avec nous</SectionLabel>
            <h1 className="mt-3 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
              Ce qui compte vraiment pour les artisans qui utilisent Compyo.
            </h1>
            <p className="mt-6 text-lg text-ink/70 max-w-xl mx-auto leading-relaxed">
              Chaque retour est analysé, regroupé avec les retours similaires, et nous aide à
              décider des prochaines améliorations. Les informations des autres artisans restent
              toujours anonymes.
            </p>
          </Reveal>

          {/* SEO/GEO (05/09) — le contenu réel de cette page (les bulles de
              la carte mentale) est chargé côté client par CarteMentale.tsx
              (fetch après montage) : un moteur de recherche ou une IA qui ne
              lit que le HTML servi ne voit donc que ce paragraphe d'intro,
              sans jamais savoir sur QUELS THÈMES portent les retours des
              artisans — même problème identifié et corrigé sur l'accueil.
              Les catégories, elles, sont une liste fixe (lib/retours/
              taxonomie.ts, jamais générée par l'IA) : on peut donc citer les
              vrais intitulés sans rien inventer, contrairement au contenu
              des bulles elles-mêmes qui dépend des retours reçus. */}
          <p className="sr-only">
            Catégories de retours suivies sur cette carte mentale :{" "}
            {CATEGORIES.map((c) => c.label).join(", ")}.
          </p>
        </div>
      </div>

      <section className="bg-paper pb-20 sm:pb-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <Reveal delay={100}>
            <CarteMentale estAdmin={estAdmin} />
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
