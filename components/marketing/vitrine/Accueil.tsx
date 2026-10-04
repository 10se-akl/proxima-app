import type { ReactNode } from "react";
import { Header, Footer } from "@/components/marketing/Cadre";
import { Hero } from "./Hero";
import { SectionJournee } from "./SectionJournee";
import { SectionMetiers } from "./SectionMetiers";
import { SectionDeuxSoirees, SectionEnVrai, SectionSoiree } from "./Sections";
import { Rythme } from "./Rythme";
import { BandeMots, FondVivant } from "./Mouvement";
import "./vitrine.css";

// ============================================================
// L'accueil (24/09) — l'histoire d'une journée d'artisan.
//
//   1. Hero            — la promesse : vos soirées ne sont pas faites
//                        pour la paperasse ; un écran verrouillé à 19:04
//                        où tout est déjà fait.
//   2. Deux soirées    — la même table, 21:47 sans Compyo, 19:04 avec.
//                        Le visiteur fait glisser la séparation.
//   3. La journée      — six scènes, de 07:48 à 18:40, sur un seul
//                        chantier. Trois se manipulent (le devis, la
//                        signature, le planning).
//   4. En vrai         — la même chose, filmée dans l'app.
//   5. Votre métier    — dix-sept cartes ; la carte choisie se déploie.
//   6. 19:04           — la soirée est à vous.
//
// Aucune bibliothèque : HTML, CSS, SVG, et un peu de JavaScript natif
// pour les scènes qui jouent. Aucun contenu inventé : pas de témoignage,
// pas de chiffre d'utilisateurs, pas de note. Les noms (Mme Garnier,
// M. Lefèvre…) sont ceux d'une démonstration, présentée comme telle.
//
// Les emplacements photo sont prêts (photos.ts) : les visuels actuels
// sont dessinés et tiennent seuls.
//
// Téléphone (25/09, 80 % des visiteurs) : pas le même site en plus étroit,
// mais une suite d'écrans pensés pour le pouce — le hero est l'écran
// verrouillé de l'artisan, les deux soirées basculent au défilement, la
// journée se regarde comme une story, chaque métier s'ouvre dans une
// feuille, et l'inscription reste sous le pouce (Rythme.tsx).
// ============================================================

export function Accueil({ avis }: { avis?: ReactNode } = {}) {
  return (
    <div className="vitrine bg-paper text-ink">
      {/* 04/10 — le fond qui vit au défilement, et le filet de progression. */}
      <FondVivant />
      <Header ctaTelephone={false} />
      <main>
        <Hero />
        <SectionDeuxSoirees />
        <BandeMots mots={["Devis", "Factures", "Planning", "Relances", "Photos", "Signature", "Notes vocales"]} />
        <SectionJournee />
        <SectionEnVrai />
        <BandeMots sens={-1} mots={["Plaquiste", "Plombier", "Électricien", "Maçon", "Couvreur", "Carreleur", "Peintre", "Menuisier"]} />
        <SectionMetiers />
        {/* Reste invisible tant qu'il n'y a pas de fiche Google — voir
            components/marketing/AvisGoogle.tsx. */}
        {avis}
        <SectionSoiree />
      </main>
      <div data-sans-barre>
        <Footer />
      </div>
      <Rythme />
    </div>
  );
}
