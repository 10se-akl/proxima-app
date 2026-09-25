import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";
import { Header, Footer } from "@/components/marketing/Cadre";
import { DemoDevis } from "@/components/marketing/DemoDevis";
import { DemoImport } from "@/components/marketing/DemoImport";
import { DemoPlanning } from "@/components/marketing/DemoPlanning";
import { DemoNotesVocales } from "@/components/marketing/DemoNotesVocales";
import { SectionSecurite } from "@/components/marketing/SectionSecurite";
import { SectionNouveautes } from "@/components/marketing/SectionNouveautes";

// 25/09 — metaPage : adresse canonique et aperçu de partage propres à
// la page (avant, ils étaient hérités de l'accueil). Voir lib/seo.ts.
export const metadata: Metadata = metaPage({
  titre: "Fonctionnalités",
  description:
    "Projet créé depuis le message du client, notes vocales, photos, devis avec vos prix, signature en ligne, factures, planning : ce que fait Compyo.",
  chemin: "/fonctionnalites",
});

// 25/09 — La liste des fonctionnalités vit maintenant dans les données
// structurées globales (app/layout.tsx), présentes sur toutes les pages.
// Celle d'ici, sous le même @id, en donnait une deuxième version,
// différente : deux descriptions du même logiciel qui ne concordent pas.

// Page dédiée aux fonctionnalités, séparée de l'accueil — à la demande
// d'Axel : l'accueil ne montre plus que 4 grandes cartes très courtes
// (voir CartesApercu dans LandingPage.tsx), et c'est ICI que quelqu'un qui
// veut vraiment creuser clique et atterrit. Reprend les 4 sections "démo"
// (fond grille + parallaxe) en entier, chacune enveloppée dans un id pour
// que les liens de l'accueil (/fonctionnalites#devis, #import, #planning,
// #notes-vocales) arrivent directement au bon endroit plutôt qu'en haut
// de page. La page doit pouvoir convaincre un artisan à elle seule, d'où
// la section Sécurité & confidentialité à la fin.
export default function FonctionnalitesPage() {
  return (
    <div>
      <Header />

      <div className="bg-paper">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-16 pb-4 sm:pt-24 sm:pb-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
            Fonctionnalités
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight">
            Tout ce que Compyo fait pour vous.
          </h1>
        </div>
      </div>

      <div id="devis">
        <DemoDevis />
      </div>
      <div id="import">
        <DemoImport />
      </div>
      <div id="planning">
        <DemoPlanning />
      </div>
      <div id="notes-vocales">
        <DemoNotesVocales />
      </div>

      <SectionNouveautes />

      {/* Sécurité/confidentialité : déplacée ici depuis l'accueil (qui
          devient très court) — sa place naturelle est sur la page qui doit
          "convaincre un artisan à elle seule", une fois qu'il a déjà vu
          les 4 fonctionnalités et se pose légitimement la question de la
          confiance. */}
      <SectionSecurite />

      <Footer />
    </div>
  );
}
