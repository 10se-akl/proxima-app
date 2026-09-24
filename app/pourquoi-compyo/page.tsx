import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/Cadre";

export const metadata: Metadata = {
  title: "Pourquoi Compyo — Un copilote, pas un remplaçant",
  description:
    "Compyo ne remplace pas les artisans, il supprime les tâches répétitives. Découvrez la philosophie du produit : l'IA propose, l'artisan décide et garde toujours le contrôle.",
};

// Page dédiée à la philosophie / vision du produit, séparée de l'accueil —
// même logique que /fonctionnalites (voir app/fonctionnalites/page.tsx) :
// l'accueil reste court, et c'est ici que quelqu'un qui se demande
// sincèrement "pourquoi une IA sur mon métier ?" trouve une vraie réponse,
// pas un slogan. Reprend et développe la matière de Problemes() et
// Resultats() dans components/marketing/LandingPage.tsx, sans copier leur
// mise en page telle quelle.
export default function PourquoiCompyoPage() {
  return (
    <div>
      <Header />

      <IntroPhilosophie />
      <Frustrations />
      <Resultats />
      <Limites />
      <CTA />

      <Footer />
    </div>
  );
}

// ============================================================
// La philosophie centrale, mise en scène en premier et sans détour —
// c'est la raison d'être de cette page entière, tout le reste n'en est
// que le détail.
// ============================================================
function IntroPhilosophie() {
  return (
    <section className="bg-anthracite">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-20 pb-20 sm:pt-28 sm:pb-28 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/50 mb-6">
            Pourquoi Compyo
          </p>
          <p className="font-display text-3xl sm:text-5xl text-white font-semibold leading-[1.15] tracking-tight text-balance">
            Nous ne voulons pas remplacer les artisans.
            <br />
            Nous voulons supprimer les tâches répétitives.
          </p>
          <p className="mt-8 text-lg sm:text-xl text-white/70 leading-relaxed">
            Compyo travaille avec eux. Pas à leur place.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// Les frustrations concrètes — reprises et développées à partir de
// Problemes() dans LandingPage.tsx, avec la place ici de les expliquer
// plutôt que de les résumer en une ligne.
// ============================================================
function Frustrations() {
  const items = [
    {
      titre: "Les appels qui coupent le chantier",
      texte:
        "Un client au téléphone en pleine pose de carrelage, et c'est toute la concentration qui se casse. Il faut reposer les outils, quitter le geste, répondre — puis retrouver le fil. Ce genre d'interruption ne se voit pas sur un planning, mais elle coûte du temps et de l'énergie tous les jours.",
    },
    {
      titre: "Les devis qui prennent des heures le soir",
      texte:
        "Après une journée sur le terrain, il faut encore reconstituer de mémoire ce qui a été vu, mesuré, discuté le matin même — souvent tard, souvent fatigué. Ce travail de reconstitution est aussi long que le devis lui-même, et il n'a rien à voir avec le métier d'artisan.",
    },
    {
      titre: "Les photos perdues",
      texte:
        "Des dizaines de photos de chantier éparpillées entre la galerie du téléphone, trois conversations SMS et une messagerie professionnelle. Le jour où il faut retrouver la photo du tableau électrique avant travaux, personne ne sait plus où elle est passée.",
    },
    {
      titre: "Les rappels oubliés",
      texte:
        "Un client qui attend une réponse depuis trois jours, sans que personne ne s'en rende compte — pas par négligence, mais parce qu'il n'y a tout simplement pas le temps de tout suivre à la main. Et c'est souvent ce silence-là, plus que le prix, qui fait perdre un chantier.",
    },
  ];

  return (
    <section className="bg-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Ce que vous vivez déjà</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Ce n&apos;est pas le métier qui est dur. C&apos;est tout ce qui l&apos;entoure.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 gap-6">
          {items.map((item, i) => (
            <Reveal key={item.titre} delay={i * 60}>
              <div className="h-full rounded-2xl border border-ink/10 bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/[0.06]">
                <h3 className="font-semibold text-base">{item.titre}</h3>
                <p className="mt-3 text-sm text-ink/60 leading-relaxed">{item.texte}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Les résultats concrets — reprend les chips de Resultats() dans
// LandingPage.tsx, dans un bloc sombre fixe qui porte le message central
// du produit : le contrôle reste entre les mains de l'artisan.
// ============================================================
function Resultats() {
  const items = [
    "Moins d'appels ratés",
    "Moins d'oublis",
    "Moins d'administratif le soir",
    "Plus de temps sur le terrain",
    "Plus d'organisation",
  ];

  return (
    <section className="bg-anthracite">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/50 mb-5">
            Ce que ça change
          </p>
          <p className="font-display text-2xl sm:text-4xl text-white font-semibold leading-snug max-w-2xl mx-auto">
            L&apos;IA ne remplace jamais l&apos;artisan. Vous gardez toujours le contrôle.
          </p>
          <p className="mt-5 text-white/60 max-w-xl mx-auto leading-relaxed">
            Compyo absorbe les tâches répétitives — pas les décisions. Voici ce que ça libère,
            concrètement, dans une journée.
          </p>
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {items.map((texte, i) => (
            <Reveal key={texte} delay={i * 70} className="inline-flex">
              <span className="inline-flex rounded-full border border-white/15 text-white/85 text-sm px-5 py-2.5">
                {texte}
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Les limites, assumées comme une garantie produit — pas une clause de
// style. C'est le passage le plus important pour convaincre un artisan
// sceptique de l'IA : dire précisément où elle s'arrête.
// ============================================================
function Limites() {
  return (
    <section className="bg-paper">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Ce que l&apos;IA ne fait jamais</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Ce n&apos;est pas une promesse marketing. C&apos;est une garantie du produit.
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 space-y-6 text-base text-ink/70 leading-relaxed">
            <p>
              L&apos;IA ne décide jamais du prix final. Dans Compyo, c&apos;est un moteur de
              calcul déterministe — pas un modèle de langage — qui fixe les prix, à partir des
              postes et des règles que vous définissez. L&apos;IA se contente de proposer les
              postes du devis, jamais leur montant.
            </p>
            <p>
              Rien ne part au client sans être passé sous vos yeux. Chaque devis, chaque
              message, chaque résumé généré par Compyo reste une proposition à valider — vous
              gardez la main pour corriger, ajuster ou refuser avant tout envoi.
            </p>
            <p>
              Compyo n&apos;automatise pas le jugement du métier : lecture d&apos;un chantier,
              relation avec le client, décision finale. Il automatise ce qui, autour de ce
              métier, n&apos;a jamais eu besoin d&apos;être fait par un humain — ressaisir,
              retrouver, se souvenir.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// CTA final — même destination que le reste du site marketing.
// ============================================================
function CTA() {
  return (
    <section className="bg-surface border-t border-ink/10">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <Reveal>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            Compyo est en bêta privée, avec quelques artisans.
          </h2>
          <p className="mt-4 text-base text-ink/60 leading-relaxed max-w-lg mx-auto">
            Chaque candidature est lue et examinée individuellement — pas de réponse
            automatique.
          </p>
          <Link
            href="/demander-acces"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm shadow-signal/20"
          >
            Demander un accès
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
