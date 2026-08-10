"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CompyoMark } from "./CompyoMark";

export function LandingPage() {
  return (
    <div>
      <Header />
      <Hero />
      <BandeauConfiance />
      <Problemes />
      <Solutions />
      <Parcours />
      <Resultats />
      <BetaPrivee />
      <Footer />
    </div>
  );
}

// ============================================================
// Révélation discrète au défilement — CSS pur (voir globals.css), pas de
// dépendance externe. Chaque section entre dans le viewport une seule
// fois, avec un léger fondu + glissement. Respecte prefers-reduced-motion
// nativement (la classe .reveal n'a d'effet que si l'utilisateur n'a pas
// demandé de réduire les animations, voir globals.css).
// ============================================================
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const noeud = ref.current;
    if (!noeud) return;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVisible(true);
          observateur.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, []);

  return { ref, className: `reveal ${visible ? "is-visible" : ""}` };
}

// Volontairement toujours un <div> plutôt qu'un composant polymorphe :
// plus simple à typer correctement en TypeScript strict, et un div en
// display inline-flex (voir Resultats plus bas) rend visuellement
// identique à un <span>.
function Reveal({
  delay,
  className = "",
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { ref, className: classeReveal } = useRevealOnScroll<HTMLDivElement>();
  // "delay" peut valoir 0 (premier élément d'une liste, i * décalage) —
  // un simple `delay && ...` le traiterait comme absent (0 est falsy en
  // JS) sans que ça change quoi que ce soit visuellement ici, mais autant
  // écrire la vérification correctement plutôt que de compter sur la
  // coïncidence que 0ms est de toute façon la valeur par défaut.
  const style = delay !== undefined ? { transitionDelay: `${delay}ms` } : undefined;
  return (
    <div ref={ref} className={`${classeReveal} ${className}`} style={style}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
      {children}
    </p>
  );
}

// ============================================================
// En-tête
// ============================================================
function Header() {
  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <CompyoMark taille={30} />
          <span className="font-display font-semibold tracking-tight">Compyo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#parcours" className="text-sm text-ink/70 hover:text-ink transition-colors">
            Comment ça marche
          </a>
          <a href="#solutions" className="text-sm text-ink/70 hover:text-ink transition-colors">
            Fonctionnalités
          </a>
          <a href="#beta" className="text-sm text-ink/70 hover:text-ink transition-colors">
            Bêta privée
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:block text-sm text-ink/70 hover:text-ink">
            Se connecter
          </Link>
          <Link
            href="/demander-acces"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-signal transition-colors"
          >
            Rejoindre la bêta privée
          </Link>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// Hero — le titre doit se comprendre en moins de 10 secondes, avec une
// vraie maquette produit à droite, pas une illustration décorative.
// ============================================================
function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      {/* Halo décoratif très discret, purement CSS — donne de la profondeur
          sans ajouter de poids ni distraire du texte. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 w-[36rem] h-[36rem] rounded-full bg-signal/[0.07] blur-3xl"
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-20 sm:pt-28 sm:pb-28 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <SectionLabel>Le copilote administratif des artisans</SectionLabel>
          <h1 className="font-display text-[2.4rem] leading-[1.08] sm:text-6xl sm:leading-[1.04] font-semibold tracking-tight text-balance">
            Passez plus de temps
            <br />
            sur vos chantiers.
            <br />
            <span className="text-signal">Compyo s&apos;occupe du reste.</span>
          </h1>
          <p className="mt-7 text-lg text-ink/70 max-w-md leading-relaxed">
            L&apos;assistant conçu pour les artisans du bâtiment. Il centralise vos clients, vos
            chantiers, vos photos, vos notes vocales, vos rendez-vous — et vous aide à préparer
            vos devis.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/demander-acces"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce transition-colors shadow-sm shadow-signal/20"
            >
              Rejoindre la bêta privée
            </Link>
            <a
              href="#parcours"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 text-ink font-medium px-7 py-3.5 hover:border-ink/30 hover:bg-white transition-colors"
            >
              Découvrir Compyo
            </a>
          </div>

          <p className="mt-6 text-xs text-ink/40 font-mono tracking-wide">
            Bêta privée — sur candidature, réponse sous 48h.
          </p>
        </div>

        <MockupProduit />
      </div>
    </section>
  );
}

// Une maquette réaliste du vrai tableau de bord, pas une image générique
// achetée sur une banque d'images — mêmes libellés, même logique que
// l'app réelle (voir app/dashboard/page.tsx), simplement figée pour la
// démonstration.
function MockupProduit() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-ink/5"
      />
      <div className="relative rounded-2xl border border-ink/10 bg-white shadow-xl shadow-ink/[0.06] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-ink/10 bg-paper/60">
          <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
          <span className="ml-3 font-mono text-[11px] text-ink/50">Compyo — aujourd&apos;hui</span>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
              À faire aujourd&apos;hui
            </p>
            <span className="font-mono text-[10px] text-ink/30">3 chantiers actifs</span>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between rounded-xl border border-ink/10 px-4 py-3 text-sm">
              <span className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-signal shrink-0" />
                Sophie Martin — Salle de bain
              </span>
              <span className="font-mono text-[10px] text-steel">Devis à envoyer</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-ink/10 px-4 py-3 text-sm">
              <span className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#D9861A] shrink-0" />
                Julien Roche — Chaudière
              </span>
              <span className="font-mono text-[10px] text-steel">RDV 14h</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-ink/10 px-4 py-3 text-sm opacity-60">
              <span className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#2F8F5B] shrink-0" />
                Amandine Roy — Tableau électrique
              </span>
              <span className="font-mono text-[10px] text-steel">Photos ajoutées</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-paper p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-steel mb-2">
              Résumé de l&apos;IA — chantier Martin
            </p>
            <p className="text-xs text-ink/70 leading-relaxed">
              Douche italienne, 4m². Accès facile. Mesures prises, il manque encore le choix de
              la robinetterie avant de finaliser le devis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Bandeau de confiance
// ============================================================
function BandeauConfiance() {
  const items = [
    "Pensé avec des artisans",
    "Bêta privée",
    "Développé en France",
    "Sécurité des données",
  ];

  return (
    <section className="bg-white border-y border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {items.map((item) => (
          <span
            key={item}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink/45"
          >
            <span className="w-1 h-1 rounded-full bg-signal/60" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Les problèmes — nommer précisément les frustrations avant de proposer
// la solution, pour que l'artisan se reconnaisse immédiatement.
// ============================================================
function Problemes() {
  const items = [
    { titre: "Les appels qui coupent le chantier", texte: "Un client au téléphone, et c'est le fil du travail qui se casse." },
    { titre: "Les devis qui prennent des heures", texte: "Le soir, à froid, pour reconstituer ce qui a été vu le matin." },
    { titre: "Les photos perdues", texte: "Éparpillées entre la galerie du téléphone et trois conversations." },
    { titre: "Les informations dispersées", texte: "SMS, WhatsApp, mail, papier — jamais au même endroit." },
    { titre: "Les rappels oubliés", texte: "Le client qui attend une réponse depuis trois jours, sans que personne s'en rende compte." },
    { titre: "Le planning compliqué", texte: "Un agenda papier, un carnet, une mémoire — et un double rendez-vous de temps en temps." },
  ];

  return (
    <section className="bg-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Ce que vous vivez déjà</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            L&apos;administratif ne devrait pas être le plus dur de votre journée.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <Reveal key={item.titre} delay={i * 60}>
              <div className="h-full rounded-2xl border border-ink/10 bg-white p-6">
                <h3 className="font-semibold text-sm">{item.titre}</h3>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">{item.texte}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Les solutions — chaque fonctionnalité dans une carte, sobre et concrète.
// ============================================================
function Solutions() {
  const items = [
    { titre: "Gestion des clients", texte: "Chaque client, son historique complet, retrouvé en un clic." },
    { titre: "Planning", texte: "Rendez-vous et tâches, sans double réservation possible." },
    { titre: "Photos", texte: "Rattachées automatiquement au bon chantier, jamais perdues." },
    { titre: "Notes vocales", texte: "Dictez sur la route, Compyo transcrit et range." },
    { titre: "Analyse IA", texte: "Elle résume le besoin et repère ce qu'il manque encore." },
    { titre: "Préparation des devis", texte: "L'IA propose les postes, un moteur de calcul fixe les prix." },
    { titre: "Historique complet", texte: "Du premier appel à la fin des travaux, tout est tracé." },
    { titre: "Organisation automatique", texte: "Rien à classer vous-même — Compyo range en continu." },
  ];

  return (
    <section id="solutions" className="bg-white border-y border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Ce que Compyo change</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Un outil, pensé pour le rythme réel d&apos;un chantier.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, i) => (
            <Reveal key={item.titre} delay={i * 50}>
              <div className="h-full rounded-2xl border border-ink/10 bg-paper p-6 hover:border-signal/30 hover:bg-white transition-colors">
                <h3 className="font-semibold text-sm">{item.titre}</h3>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">{item.texte}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Démonstration — la timeline d'un chantier réel, du premier appel à la
// fin des travaux.
// ============================================================
function Parcours() {
  const etapes = [
    { n: "01", titre: "Le client appelle", texte: "Par téléphone, SMS ou message — comme d'habitude." },
    { n: "02", titre: "Le projet est créé", texte: "Collez le message ou dictez une note — prêt en quelques secondes." },
    { n: "03", titre: "L'artisan ajoute des photos", texte: "Rattachées automatiquement au bon chantier." },
    { n: "04", titre: "Il dicte une note", texte: "Sur la route, en sortant du rendez-vous — l'essentiel, à chaud." },
    { n: "05", titre: "Compyo résume tout", texte: "L'IA fait la synthèse et repère ce qu'il manque encore." },
    { n: "06", titre: "Le devis est préparé", texte: "L'IA propose les postes, un moteur de calcul fixe les prix — jamais l'inverse." },
    { n: "07", titre: "Le chantier est planifié", texte: "Rendez-vous et tâches liés au projet, visibles d'un coup d'œil." },
  ];

  return (
    <section id="parcours" className="bg-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Comment ça marche</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-lg">
            Le vrai parcours d&apos;un chantier, du premier appel à la fin des travaux.
          </h2>
        </Reveal>

        <div className="mt-14 max-w-2xl">
          {etapes.map((e, i) => (
            <Reveal key={e.n} delay={i * 40}>
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="shrink-0 grid place-items-center w-9 h-9 rounded-full border border-ink/15 font-mono text-xs text-steel bg-white">
                    {e.n}
                  </span>
                  {i < etapes.length - 1 && <span className="w-px flex-1 bg-ink/10 my-1" />}
                </div>
                <div className="pb-9">
                  <h3 className="font-semibold text-sm">{e.titre}</h3>
                  <p className="mt-1.5 text-sm text-ink/60 leading-relaxed">{e.texte}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Pourquoi Compyo — uniquement le résultat, jamais la technologie.
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
    <section className="bg-ink">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-paper/50 mb-5">
            Pourquoi Compyo
          </p>
          <p className="font-display text-2xl sm:text-4xl text-paper font-semibold leading-snug max-w-2xl mx-auto">
            L&apos;IA ne remplace jamais l&apos;artisan. Vous gardez toujours le contrôle.
          </p>
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {items.map((texte, i) => (
            <Reveal key={texte} delay={i * 70} className="inline-flex">
              <span className="inline-flex rounded-full border border-white/15 text-paper/85 text-sm px-5 py-2.5">
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
// Bêta privée
// ============================================================
function BetaPrivee() {
  return (
    <section id="beta" className="bg-white border-y border-ink/10">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
            Bêta privée
          </p>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold max-w-xl mx-auto leading-snug tracking-tight">
            Nous construisons Compyo avec quelques artisans, pas seuls dans notre coin.
          </h2>
          <p className="mt-5 text-base text-ink/60 max-w-lg mx-auto leading-relaxed">
            L&apos;accès est volontairement limité : chaque retour compte, et fait évoluer
            Compyo directement. Chaque candidature est lue et examinée individuellement — pas
            de réponse automatique.
          </p>
          <Link
            href="/demander-acces"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce transition-colors shadow-sm shadow-signal/20"
          >
            Demander un accès
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// Pied de page — sobre, sans lien mort. Les pages mentions légales et
// confidentialité seront ajoutées ici dès qu'elles existeront (en cours).
// ============================================================
function Footer() {
  return (
    <footer className="bg-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <CompyoMark variante="blanc" taille={26} />
          <span className="text-sm text-paper/70">Compyo — bêta privée</span>
        </div>
        <a
          href="mailto:proxima.saas@gmail.com"
          className="font-mono text-xs text-paper/40 hover:text-paper/70 transition-colors"
        >
          proxima.saas@gmail.com
        </a>
      </div>
    </footer>
  );
}
