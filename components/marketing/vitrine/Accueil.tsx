import type { ReactNode } from "react";
import { Header, Footer } from "@/components/marketing/Cadre";
import { Hero } from "./Hero";
import { SectionJournee } from "./SectionJournee";
import { SectionMetiers } from "./SectionMetiers";
import { SectionFilm, SectionSoiree } from "./Sections";
import { SectionFil } from "./SectionFil";
import { Rythme } from "./Rythme";
import { BandeMots, FondVivant } from "./Mouvement";
import "./vitrine.css";

// ============================================================
// L'accueil (24/09) — l'histoire d'une journée d'artisan. Remis en ordre
// le 18/10 (Axel : l'essentiel, dans cet ordre, rien d'autre) :
//
//   1. Hero            — la promesse : vos soirées ne sont pas faites
//                        pour la paperasse ; Compyo, le compagnon des
//                        artisans ; un écran verrouillé à 19:04 où tout
//                        est déjà fait.
//   2. La journée      — six scènes, de 07:48 à 18:40, sur un seul
//                        chantier (Mme Garnier). Trois se manipulent (le
//                        devis, la signature, le planning).
//   3. Le fil          — huit étapes sur un même fil : ce qui est dit une
//                        fois suit tout le chantier.
//   4. Le film         — une minute, sans coupe, le même chantier du
//                        message à la facture, puis le soir (Sections.tsx).
//   5. Votre métier    — dix-sept cartes ; la carte choisie se déploie.
//                        Une bande de métiers y mène.
//   6. 19:04           — la soirée est à vous.
//
// Retirés le 18/10 : le film de 16 s (une pub : il reste en vidéo dans
// compyo/pub-motion/), « En vrai » (les deux anciennes démos, remplacées
// par le film d'une minute) et la bande de mots qui répétait le fil.
//
// Aucune bibliothèque : HTML, CSS, SVG, et un peu de JavaScript natif
// pour les scènes qui jouent ; le film est un fichier vidéo. Aucun contenu
// inventé : pas de témoignage, pas de chiffre d'utilisateurs, pas de note.
// Les noms (Mme Garnier, M. Lefèvre…) sont ceux d'une démonstration,
// présentée comme telle.
//
// Les emplacements photo sont prêts (photos.ts) : les visuels actuels
// sont dessinés et tiennent seuls.
//
// Téléphone (25/09, 80 % des visiteurs) : pas le même site en plus étroit,
// mais une suite d'écrans pensés pour le pouce — le hero est l'écran
// verrouillé de l'artisan, la journée se regarde comme une story, le film
// passe en vertical, chaque métier s'ouvre dans une feuille, et
// l'inscription reste sous le pouce (Rythme.tsx).
// ============================================================

export function Accueil({ avis }: { avis?: ReactNode } = {}) {
  return (
    <div className="vitrine bg-paper text-ink">
      {/* 04/10 — le fond qui vit au défilement, et le filet de progression. */}
      <FondVivant />
      <Header ctaTelephone={false} />
      <main>
        <Hero />
        <SectionJournee />
        <SectionFil />
        <SectionFilm />
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
