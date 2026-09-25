import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";
import Link from "next/link";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/Cadre";

// 25/09 — metaPage : adresse canonique et aperçu de partage propres à
// la page (avant, ils étaient hérités de l'accueil). Voir lib/seo.ts.
export const metadata: Metadata = metaPage({
  titre: "Bêta privée",
  description:
    "Pourquoi Compyo se construit en bêta privée, sur candidature, avec un petit nombre d'artisans plutôt qu'en lancement ouvert — et comment rejoindre.",
  chemin: "/beta",
});

// Page dédiée à la bêta privée — même logique que /fonctionnalites (voir
// app/fonctionnalites/page.tsx) : l'accueil ne parle plus du tout de la
// bêta en détail (il ne garde qu'un CTA "Demander un accès"), et c'est
// ICI, via le lien "Bêta" du Header (pointant directement sur /beta), que
// quelqu'un qui veut vraiment comprendre la démarche atterrit.
export default function BetaPage() {
  return (
    <div>
      <Header />

      <div className="bg-paper">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-16 pb-4 sm:pt-24 sm:pb-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
            Bêta privée
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
            Compyo se construit avec quelques artisans, pas seul dans son coin.
          </h1>
          <p className="mt-6 text-lg text-ink/70 max-w-xl mx-auto leading-relaxed">
            Pas de lancement ouvert, pas de liste d&apos;attente de masse. Une candidature, lue
            individuellement, et un produit qui évolue avec les gens qui l&apos;utilisent
            vraiment.
          </p>
        </div>
      </div>

      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <SectionLabel>Pourquoi une bêta privée</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              Construire avec de vrais artisans, plutôt que deviner seul.
            </h2>
            <p className="mt-5 text-base text-ink/70 leading-relaxed">
              Compyo n&apos;est pas parti d&apos;une étude de marché, mais d&apos;un besoin
              observé de près : celui d&apos;artisans qui perdent du temps sur l&apos;administratif
              plutôt que sur leurs chantiers. Le risque, avec ce genre de produit, c&apos;est de
              construire dans son coin ce qu&apos;on imagine être utile — et de se tromper sur
              des détails qui, pour un artisan, changent tout au quotidien.
            </p>
            <p className="mt-4 text-base text-ink/70 leading-relaxed">
              Une bêta privée oblige à faire l&apos;inverse : mettre le produit entre les mains
              d&apos;un petit nombre de personnes qui l&apos;utilisent réellement, sur de vrais
              chantiers, et ajuster en fonction de ce qui se passe concrètement plutôt que de ce
              qui semblait une bonne idée sur le papier.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface border-y border-ink/10">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <SectionLabel>Pourquoi l&apos;accès est limité</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              Chaque retour compte vraiment, et fait évoluer le produit.
            </h2>
            <p className="mt-5 text-base text-ink/70 leading-relaxed">
              Avec un grand nombre d&apos;utilisateurs dès le départ, les retours se noient : on
              ne peut plus vraiment écouter chacun, encore moins agir dessus individuellement.
              L&apos;accès à Compyo reste donc volontairement limité, pour que chaque personne qui
              rejoint la bêta ait un poids réel sur ce que devient le produit — pas une voix
              perdue dans un grand nombre.
            </p>
            <p className="mt-4 text-base text-ink/70 leading-relaxed">
              Concrètement, chaque candidature est lue et examinée individuellement. Pas de
              réponse automatique, pas de formulaire qui débouche sur un accès générique : une
              vraie lecture, pour comprendre le métier et les besoins de la personne qui
              candidate, avant de décider si Compyo, à ce stade, peut réellement lui être utile.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <SectionLabel>Ce que ça change pour vous</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              Un produit vivant, pas encore figé — et c&apos;est voulu.
            </h2>
            <p className="mt-5 text-base text-ink/70 leading-relaxed">
              Rejoindre la bêta, c&apos;est rejoindre un produit qui bouge. Certaines
              fonctionnalités évoluent vite, certains écrans peuvent encore changer d&apos;une
              semaine à l&apos;autre, et tout n&apos;est pas encore parfaitement rodé. Compyo
              n&apos;est pas un produit fini : c&apos;est une bêta, au sens plein du terme, et
              ça n&apos;a pas vocation à être caché.
            </p>
            <p className="mt-4 text-base text-ink/70 leading-relaxed">
              En échange, votre avis compte directement. Un message, une frustration, une
              fonctionnalité qui manque — ça arrive à quelqu&apos;un qui peut réellement en
              tenir compte, pas dans une file d&apos;attente de support noyée sous d&apos;autres
              demandes. Si vous cherchez un outil totalement stabilisé, ce n&apos;est peut-être
              pas encore le bon moment. Si vous voulez un outil qui se construit aussi un peu
              autour de votre façon de travailler, c&apos;est exactement le but de cette bêta.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface border-y border-ink/10">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <SectionLabel>Comment rejoindre</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              Une candidature, examinée sous 48h.
            </h2>
            <p className="mt-5 text-base text-ink/70 leading-relaxed">
              L&apos;accès se fait uniquement par candidature, via le formulaire dédié. Quelques
              questions sur votre métier et votre activité suffisent — chaque réponse est lue
              par une vraie personne, pas triée automatiquement. La réponse arrive sous 48h,
              qu&apos;elle soit positive ou non.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-anthracite">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 sm:py-24 text-center">
          <Reveal>
            <p className="font-display text-2xl sm:text-3xl text-white font-semibold leading-snug">
              Envie de faire partie des premiers artisans à façonner Compyo&nbsp;?
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

      <Footer />
    </div>
  );
}
