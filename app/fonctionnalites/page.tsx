import type { Metadata } from "next";
import { Header, Footer } from "@/components/marketing/LandingPage";
import { DemoDevis } from "@/components/marketing/DemoDevis";
import { DemoImport } from "@/components/marketing/DemoImport";
import { DemoPlanning } from "@/components/marketing/DemoPlanning";
import { DemoNotesVocales } from "@/components/marketing/DemoNotesVocales";
import { SectionSecurite } from "@/components/marketing/SectionSecurite";
import { SectionNouveautes } from "@/components/marketing/SectionNouveautes";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  // SEO (05/09) — le layout racine applique déjà un template "%s — Compyo"
  // (voir app/layout.tsx) : garder "— Compyo" ici aussi produisait un
  // titre dupliqué ("Fonctionnalités — Compyo — Compyo") dans l'onglet du
  // navigateur et les résultats de recherche.
  title: "Fonctionnalités",
  description:
    "Devis et facturation électronique, import automatique des messages clients, planning avec alerte météo, notes vocales transcrites, adapté à 18 corps de métier — le détail de ce que fait Compyo pour les artisans du bâtiment.",
};

// SEO/GEO (05/09) — cette page détaille les 4 fonctionnalités du produit,
// c'était jusqu'ici la seule information non lisible par un moteur (humain
// ou IA) qui ne lit QUE les données structurées : le JSON-LD global de
// app/layout.tsx décrit Compyo comme "SoftwareApplication" mais sans
// featureList. On référence ce même @id (${URL_SITE}/#logiciel) plutôt que
// d'en redéclarer un second — un même produit, une seule entité — et on
// n'ajoute que ce qui manque : la liste des fonctionnalités, reprise mot
// pour mot du contenu réellement visible sur cette page juste en dessous
// (jamais de données inventées, cohérent avec la note déjà présente dans
// layout.tsx sur les champs volontairement omis).
const DONNEES_STRUCTUREES_FONCTIONNALITES = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#logiciel`,
  featureList: [
    "Génération de devis en quelques secondes à partir des notes de chantier, avec un moteur de calcul déterministe",
    "Devis express pour chiffrer directement à la main une intervention déjà réalisée sur place",
    "Facturation électronique : numérotation légale, acomptes, avoirs, export comptable",
    "Import automatique d'une demande client depuis un message (SMS, WhatsApp, capture d'écran)",
    "Planning unifié des rendez-vous et chantiers, avec détection des conflits de créneaux",
    "Alerte météo sur le planning pour les chantiers extérieurs sensibles",
    "Rappel client récurrent en un clic pour l'entretien saisonnier ou annuel",
    "Champs et checklists adaptés à 18 corps de métier du bâtiment",
    "Notes vocales dictées sur le chantier, transcrites et rattachées automatiquement au bon projet",
  ],
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES_FONCTIONNALITES) }}
      />
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
