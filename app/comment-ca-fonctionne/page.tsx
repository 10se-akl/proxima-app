import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "Comment ça fonctionne — Compyo",
  description:
    "Du premier appel du client à la fin du chantier : le parcours complet d'un projet avec Compyo, étape par étape — import automatique, notes vocales transcrites, devis généré par IA avec moteur de calcul déterministe, planning unifié.",
};

// Page dédiée au parcours complet d'un chantier avec Compyo — à la demande
// d'Axel : l'accueil ne montre plus que la version compacte à 5 étapes
// (voir Parcours() dans LandingPage.tsx, toujours affichée sur `/`), et
// c'est ICI que quelqu'un qui veut vraiment comprendre le fonctionnement
// clique et atterrit. Le contenu reprend les mêmes étapes dans l'esprit,
// mais détaillées et étoffées (2-3 phrases par étape plutôt qu'une seule
// courte), avec un vrai traitement visuel de timeline : ligne centrale sur
// desktop, étapes alternées gauche/droite, et une mise en avant de
// l'étape 6 (le devis), cœur du produit.
export default function CommentCaFonctionnePage() {
  return (
    <div>
      <Header />

      <div className="bg-paper">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-16 pb-4 sm:pt-24 sm:pb-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
            Comment ça fonctionne
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
            Le vrai parcours d&apos;un chantier, du premier appel à la fin des travaux.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-ink/60 max-w-xl mx-auto leading-relaxed">
            Rien ne change pour vos clients. Tout change pour vous : à chaque étape, Compyo
            capture, range et prépare — pour que le soir, il ne reste presque plus rien à faire.
          </p>
        </div>
      </div>

      <Parcours />

      <AppelFinal />

      <Footer />
    </div>
  );
}

// ============================================================
// Timeline — sur desktop (lg+), les étapes alternent gauche/droite autour
// d'une ligne verticale centrale. Sur mobile, une seule colonne avec la
// ligne à gauche (comme sur l'accueil, mais avec bien plus de respiration
// et un texte étoffé). L'étape 6 (le devis) reçoit un encadré bg-surface
// : c'est le cœur du produit, elle mérite d'être visuellement distinguée
// des sept autres.
// ============================================================
function Parcours() {
  const etapes = [
    {
      n: "01",
      titre: "Premier contact",
      texte:
        "Le client appelle, envoie un SMS ou un message — comme d'habitude. Rien ne change de son côté : pas de nouvelle application à installer, pas de formulaire à remplir.",
    },
    {
      n: "02",
      titre: "Création du projet",
      texte:
        "Vous collez le message reçu, ou vous dictez simplement une note. Le projet est créé en quelques secondes, avec le bon client déjà rattaché. Zéro ressaisie.",
    },
    {
      n: "03",
      titre: "Ajout de photos",
      texte:
        "Vous ajoutez les photos prises sur le chantier — de la pièce, du dégât, du compteur — directement au bon projet dans Compyo, en un instant. Plus besoin de les retrouver ce soir dans la galerie.",
    },
    {
      n: "04",
      titre: "Notes vocales",
      texte:
        "Dictées sur la route, en sortant du rendez-vous, pendant que tout est encore frais. Compyo les transcrit automatiquement, sans clavier et sans y repenser le soir.",
    },
    {
      n: "05",
      titre: "Analyse IA",
      texte:
        "Compyo fait la synthèse de vos notes et de vos photos, et repère ce qu'il manque encore pour finaliser le devis — une mesure, un choix de matériau, un accès à confirmer.",
    },
    {
      n: "06",
      titre: "Préparation du devis",
      texte:
        "L'IA propose les postes à partir de ce qui a été capturé. Mais c'est un moteur de calcul déterministe, pas l'IA, qui fixe les prix — jamais l'inverse. Un vrai garde-fou du produit, pas un argument marketing : vous gardez toujours la main sur les chiffres.",
      accent: true,
    },
    {
      n: "07",
      titre: "Suivi du chantier",
      texte:
        "Rendez-vous et tâches restent liés au projet, dans un planning unifié. Pas de double réservation possible, pas de rendez-vous oublié entre deux chantiers.",
    },
    {
      n: "08",
      titre: "Fin de chantier",
      texte:
        "Le projet est clôturé. L'historique — messages, photos, notes, devis — reste accessible, prêt à être rouvert si le même client revient plus tard pour un nouveau chantier.",
    },
  ];

  return (
    <section id="parcours" className="bg-paper">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        {/* Ligne centrale (desktop) / ligne à gauche (mobile) — un seul
            élément positionné en absolu derrière la grille, plutôt que des
            segments par étape comme sur l'accueil : plus simple, et le
            rendu reste continu même avec l'alternance gauche/droite. */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-[19px] lg:left-1/2 top-2 bottom-2 w-px bg-ink/10 lg:-translate-x-1/2"
          />

          <ol className="relative flex flex-col gap-10 sm:gap-14">
            {etapes.map((e, i) => {
              const pair = i % 2 === 0;
              return (
                <li key={e.n} className="relative">
                  <Reveal delay={i * 60}>
                    <div
                      className={`grid lg:grid-cols-2 lg:gap-x-16 items-start ${
                        pair ? "" : "lg:[&>*:first-child]:order-2"
                      }`}
                    >
                      {/* Bloc texte */}
                      <div
                        className={`pl-12 lg:pl-0 ${
                          pair ? "lg:text-right lg:pr-2" : "lg:pl-2"
                        }`}
                      >
                        <div
                          className={
                            e.accent
                              ? "rounded-2xl border border-signal/25 bg-surface p-6 inline-block text-left w-full"
                              : ""
                          }
                        >
                          <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-steel">
                            Étape {e.n}
                          </span>
                          <h3 className="mt-1.5 font-display text-xl sm:text-2xl font-semibold tracking-tight">
                            {e.titre}
                          </h3>
                          <p className="mt-3 text-sm sm:text-base text-ink/65 leading-relaxed">
                            {e.texte}
                          </p>
                        </div>
                      </div>

                      {/* Colonne vide (desktop) pour laisser l'alternance
                          respirer de l'autre côté de la ligne centrale */}
                      <div className="hidden lg:block" aria-hidden />
                    </div>
                  </Reveal>

                  {/* Pastille numérotée, positionnée sur la ligne */}
                  <div
                    className={`absolute grid place-items-center w-10 h-10 rounded-full font-mono text-xs -translate-x-1/2 lg:left-1/2 left-[19px] ${
                      e.accent
                        ? "border-2 border-signal bg-signal text-white"
                        : "border border-ink/15 bg-paper text-steel"
                    }`}
                    style={{ marginTop: "-2px" }}
                  >
                    {e.n}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Appel final — même traitement que BetaPrivee sur l'accueil, pour garder
// une sortie cohérente vers la demande d'accès depuis cette page dédiée.
// ============================================================
function AppelFinal() {
  return (
    <section className="bg-surface border-y border-ink/10">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <Reveal>
          <SectionLabel>Prêt à essayer</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold max-w-xl mx-auto leading-snug tracking-tight">
            Un parcours de chantier plus simple, du premier appel jusqu&apos;à la clôture.
          </h2>
          <p className="mt-5 text-base text-ink/60 max-w-lg mx-auto leading-relaxed">
            L&apos;accès est volontairement limité : chaque retour compte, et fait évoluer Compyo
            directement.
          </p>
          <Link
            href="/demander-acces"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm shadow-signal/20"
          >
            Rejoindre la bêta privée
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
