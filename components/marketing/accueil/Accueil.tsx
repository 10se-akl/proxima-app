import type { ReactNode } from "react";
import Link from "next/link";
import { Header, Footer, Reveal } from "@/components/marketing/LandingPage";
import { VideoDemo } from "@/components/marketing/VideoDemo";
import { FondHero } from "./FondHero";
import { ChoixMetier } from "./ChoixMetier";
import { CadreEcran, EcranMessage, EcranNote, EcranDevis, EcranSuivi } from "./Maquettes";

// ============================================================
// L'accueil (20/09) — récit, pas sommaire.
//
// L'ancienne page (components/marketing/LandingImmersive.tsx, toujours
// visible sur /apercu-immersif) était une liste : hero, fonctionnalités,
// métiers, contact. On comprenait le produit sans rien ressentir. Cette
// page-ci suit l'ordre des questions que se pose un artisan :
//
//   1. le problème         — il se reconnaît avant qu'on lui vende quoi que ce soit
//   2. ce que ça donne     — la démonstration, en une image
//   3. comment ça marche   — le parcours réel, du message au paiement
//   4. pourquoi différent  — l'IA propose, il décide ; le devis est conforme
//   5. son métier à lui    — il doit se voir dans la page
//   6. rejoindre la bêta   — la demande arrive quand elle est méritée
//
// Trois règles tenues partout :
//   - une seule idée par écran, et beaucoup de vide autour (py-28 à py-44
//     entre les sections, le double de l'ancienne page) ;
//   - du très grand et du très petit, presque rien entre les deux ;
//   - le terracotta trois ou quatre fois sur toute la page. Un aplat
//     orange de grande surface fait cheap immédiatement.
//
// Cette page est rendue côté SERVEUR (pas de "use client") : seuls le
// fond animé, le lecteur vidéo et le choix du métier sont des îlots
// interactifs. C'est ce qui permet de descendre le JavaScript de
// l'accueil tout en ajoutant du contenu.
//
// Aucun contenu inventé : pas de témoignage, pas de nombre d'utilisateurs,
// pas de note. Le produit est en bêta privée — écrire le contraire se
// retournerait contre nous au premier artisan qui vérifie.
// ============================================================

const DESCRIPTION_DEMO =
  "Démonstration : un message de client partagé vers Compyo crée le projet, une note dictée sur le chantier le complète, le devis se prépare avec les tarifs de l'artisan, puis part à la signature.";

function Etiquette({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">{children}</p>
  );
}

// ---------------------------------------------------------------- 1. le problème
function Hero() {
  return (
    <section className="px-5 pt-10 sm:px-8 sm:pt-16">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-paper-warm px-6 py-24 sm:rounded-[2.5rem] sm:px-16 sm:py-36">
        <FondHero />
        {/* Le texte passe au-dessus du fond : c'est ce z-10 qui fait la
            différence entre un panneau et un papier peint. */}
        <div className="relative z-10">
          <Etiquette>Bêta privée · artisans du bâtiment</Etiquette>
          {/* Les tailles montent par paliers jusqu'à 96 px, mais la ligne
              la plus longue ("Le chantier est fini.") doit tenir en UNE
              ligne à chaque palier : une coupure au milieu casserait le
              rythme des trois phrases, qui est tout l'effet recherché. */}
          {/* text-balance : sur un écran de 390 px, "Le chantier est fini."
              ne tient pas sur une ligne à cette taille. Sans équilibrage,
              le navigateur coupe après "est" et laisse "fini." tout seul.
              Les navigateurs qui ne connaissent pas la propriété coupent
              comme avant — rien ne casse. */}
          <h1 className="mt-7 text-balance font-display text-[2.3rem] font-semibold leading-[0.98] tracking-[-0.03em] text-ink sm:text-6xl lg:text-7xl xl:text-8xl">
            Il est 19h12.
            <br />
            Le chantier est fini.
            <br />
            Pas la journée.
          </h1>
          <p className="mt-9 max-w-lg text-[17px] leading-relaxed text-ink/75 sm:text-lg">
            Reste le devis à taper, le message du client à retrouver, les photos éparpillées dans
            le téléphone. Compyo prépare tout ça pendant que vous rangez le camion. Vous relisez,
            vous envoyez.
          </p>
          <div className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/demander-acces"
              className="rounded-full bg-signal px-8 py-4 text-[15px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-warm"
            >
              Rejoindre la bêta
            </Link>
            <Link
              href="#parcours"
              className="text-[15px] font-medium text-ink underline decoration-ink/25 underline-offset-8 transition-colors hover:decoration-ink"
            >
              Voir comment ça marche
            </Link>
          </div>
          <p className="mt-8 font-mono text-[11px] tracking-wide text-steel">
            Sur candidature · réponse sous 48 h
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 2. ce que ça donne
function EnUneMinute() {
  return (
    <section className="px-5 py-28 sm:px-8 sm:py-44">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Etiquette>En une minute</Etiquette>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
            Le message du client entre d&apos;un côté.
            <br className="hidden sm:block" /> Le devis sort de l&apos;autre.
          </h2>
        </Reveal>

        <Reveal delay={120} className="mt-16">
          {/* Paysage à partir de sm ; en dessous la version verticale — en
              16:9 sur un téléphone, le devis serait illisible. Un lecteur
              masqué n'est jamais chargé. */}
          <div className="hidden sm:block">
            <div className="aspect-video overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper-warm shadow-[0_40px_90px_-50px_rgb(var(--c-ink)/0.6)]">
              <VideoDemo
                src="/compyo-demo.mp4"
                affiche="/compyo-demo-affiche.jpg"
                description={DESCRIPTION_DEMO}
              />
            </div>
          </div>
          <div className="mx-auto max-w-[320px] sm:hidden">
            <div className="aspect-[9/16] overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper-warm shadow-[0_30px_70px_-40px_rgb(var(--c-ink)/0.6)]">
              <VideoDemo
                src="/compyo-demo-vertical.mp4"
                affiche="/compyo-demo-vertical-affiche.jpg"
                description={DESCRIPTION_DEMO}
              />
            </div>
          </div>
          <p className="mt-6 text-[13px] text-steel">
            Reconstitution du parcours dans l&apos;application, sans étape coupée.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 3. comment ça marche
const TEMPS = [
  {
    titre: "Le client écrit. Vous partagez vers Compyo.",
    texte:
      "Le projet se crée tout seul : le client, l'adresse, la demande. Vous n'avez rien tapé, rien recopié.",
    ecran: <EcranMessage />,
  },
  {
    titre: "Vous dictez ce que vous avez vu.",
    texte:
      "Debout dans le garage, les mains sales. La note est transcrite et rangée dans le bon projet.",
    ecran: <EcranNote />,
  },
  {
    titre: "Le devis se prépare.",
    texte:
      "Les postes sont proposés, les montants calculés avec vos prix à vous. Vous changez ce que vous voulez, ligne par ligne.",
    ecran: <EcranDevis />,
  },
  {
    titre: "Il signe. Vous savez où ça en est.",
    texte:
      "Envoyé, ouvert, signé. Plus besoin de relancer au hasard ni de chercher qui n'a pas répondu.",
    ecran: <EcranSuivi />,
  },
];

function Parcours() {
  return (
    <section id="parcours" className="scroll-mt-20 bg-paper-warm px-5 py-28 sm:px-8 sm:py-44">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Etiquette>Le parcours</Etiquette>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
            Du message reçu au virement encaissé.
          </h2>
        </Reveal>

        <div className="mt-20 space-y-24 sm:space-y-36">
          {TEMPS.map((temps, i) => (
            <Reveal key={temps.titre}>
              <div
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <p className="font-mono text-[11px] tracking-[0.22em] text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-5 max-w-sm font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                    {temps.titre}
                  </h3>
                  <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-ink/70">
                    {temps.texte}
                  </p>
                </div>
                <div className="mx-auto w-full max-w-[22rem]">
                  <CadreEcran incline={i % 2 === 0 ? "gauche" : "droite"}>{temps.ecran}</CadreEcran>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 4. pourquoi différent
function Principe() {
  // Pleine largeur en anthracite : la seule rupture de la page. Elle tombe
  // là où le visiteur commence à se demander "oui mais, une IA qui fait
  // mes prix ?" — et c'est la réponse.
  //
  // `dark:bg-surface` : l'anthracite est un bleu-gris fixe, volontairement
  // le même dans les deux modes. Posé sur le mode sombre de Compyo, qui
  // est chaud (brun), il ressortait comme une bande bleue étrangère à la
  // palette. En sombre, la rupture se fait donc par le relief (surface,
  // plus claire que le fond) plutôt que par la couleur.
  return (
    <section className="bg-anthracite px-5 py-28 text-white dark:bg-surface sm:px-8 sm:py-44">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/45">
            Ce qui ne changera pas
          </p>
          <h2 className="mt-6 max-w-3xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] sm:text-5xl">
            L&apos;IA propose. Vous décidez. Toujours.
          </h2>
        </Reveal>

        <div className="mt-20 grid gap-14 sm:mt-28 sm:grid-cols-2 sm:gap-20">
          <Reveal>
            <h3 className="font-display text-xl font-semibold sm:text-2xl">
              Aucun prix ne sort d&apos;une IA.
            </h3>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-white/65">
              Les montants viennent d&apos;un calcul, réglé sur vos tarifs et votre taux horaire.
              L&apos;IA écrit les postes de travaux ; elle ne touche jamais aux chiffres.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <h3 className="font-display text-xl font-semibold sm:text-2xl">
              Rien ne part sans vous.
            </h3>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-white/65">
              Mentions obligatoires, TVA, délai de validité, assurance : Compyo relit le devis et
              vous dit ce qui manque. Mais c&apos;est vous qui appuyez sur envoyer.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 5. son métier
function Metiers() {
  return (
    <section className="px-5 py-28 sm:px-8 sm:py-44">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Etiquette>Votre métier</Etiquette>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
            Compyo ne parle pas «&nbsp;bâtiment&nbsp;».
            <br className="hidden sm:block" /> Il parle votre métier.
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink/70">
            Dix-huit métiers, chacun avec ses questions, ses postes et ses habitudes. Choisissez le
            vôtre.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-16">
          <ChoixMetier />
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 6. rejoindre
function Rejoindre() {
  return (
    <section className="bg-paper-warm px-5 py-28 sm:px-8 sm:py-44">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-display text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl">
            Vos soirées ne sont pas faites
            <br className="hidden sm:block" /> pour la paperasse.
          </h2>
          <Link
            href="/demander-acces"
            className="mt-12 inline-flex rounded-full bg-signal px-9 py-4 text-[15px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-warm"
          >
            Rejoindre la bêta privée
          </Link>
          <p className="mt-7 font-mono text-[11px] tracking-wide text-steel">
            Chaque candidature est lue · réponse sous 48 h
          </p>
        </Reveal>

        {/* Emplacement de témoignage, volontairement vide et annoncé comme
            tel : Compyo est en bêta privée, il n'y a pas encore d'artisan
            dont on puisse citer les mots. En inventer un est la chose la
            plus facile à faire sur un site — et la plus facile à détecter
            pour un artisan qui, lui, connaît ses collègues. */}
        <Reveal delay={150}>
          <figure className="mt-24 border-t border-ink/10 pt-12">
            <blockquote className="font-display text-xl text-ink/30 sm:text-2xl">
              [témoignage à venir]
            </blockquote>
            <figcaption className="mt-4 text-[13px] leading-relaxed text-steel">
              Les premiers retours des artisans de la bêta seront publiés ici, mot pour mot.
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- racine
export function Accueil({ avis }: { avis?: ReactNode } = {}) {
  return (
    <div className="bg-paper text-ink">
      <Header />
      <main>
        <Hero />
        <EnUneMinute />
        <Parcours />
        <Principe />
        <Metiers />
        {/* Reste invisible tant qu'il n'y a pas de fiche Google — voir
            components/marketing/AvisGoogle.tsx, comportement inchangé. */}
        {avis}
        <Rejoindre />
      </main>
      <Footer />
    </div>
  );
}
