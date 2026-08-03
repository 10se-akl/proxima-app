"use client";

import Link from "next/link";

export function LandingPage() {
  return (
    <div>
      <Header />
      <Hero />
      <Parcours />
      <Fonctionnalites />
      <Philosophie />
      <Differenciation />
      <FeuilleDeRoute />
      <BetaPrivee />
      <Footer />
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

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 bg-ink text-paper font-semibold text-sm">
            P
          </span>
          <span className="font-semibold tracking-tight">Compyo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#parcours" className="text-sm text-ink/70 hover:text-ink transition-colors">
            Comment ça marche
          </a>
          <a href="#fonctionnalites" className="text-sm text-ink/70 hover:text-ink transition-colors">
            Fonctionnalités
          </a>
          <a href="#feuille-de-route" className="text-sm text-ink/70 hover:text-ink transition-colors">
            Feuille de route
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:block text-sm text-ink/70 hover:text-ink">
            Se connecter
          </Link>
          <Link
            href="/demander-acces"
            className="inline-flex items-center gap-1.5 bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-signal transition-colors"
          >
            Rejoindre la bêta privée
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <SectionLabel>Le copilote administratif des artisans</SectionLabel>
          <h1 className="font-display text-[2.1rem] leading-[1.12] sm:text-5xl sm:leading-[1.08] font-semibold tracking-tight">
            Passez plus de temps sur vos chantiers.
            <br />
            Compyo s&apos;occupe du reste.
          </h1>
          <p className="mt-6 text-lg text-ink/70 max-w-md leading-relaxed">
            Chaque appel client, chaque photo, chaque devis, chaque rendez-vous —
            regroupés au même endroit, suivis du premier contact jusqu&apos;à la fin
            du chantier. Vous gardez la main, Compyo s&apos;occupe de l&apos;administratif.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/demander-acces"
              className="inline-flex items-center justify-center gap-2 bg-signal text-white font-medium px-6 py-3.5 hover:bg-[#c15815] transition-colors"
            >
              Demander un accès
            </Link>
            <a href="#parcours" className="text-sm text-ink/60 hover:text-ink underline underline-offset-4">
              Voir comment ça marche
            </a>
          </div>
        </div>

        {/* Mockup du dashboard, statique — reprend le vrai visuel produit */}
        <div className="border border-ink/10 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-ink/10">
            <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
            <span className="ml-3 font-mono text-[11px] text-ink/50">
              Compyo — aujourd&apos;hui
            </span>
          </div>
          <div className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
              À faire aujourd&apos;hui
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between border border-ink/10 px-3 py-2.5 text-sm">
                <span>Sophie Martin — Salle de bain</span>
                <span className="font-mono text-[10px] text-steel">Devis à envoyer</span>
              </div>
              <div className="flex items-center justify-between border border-ink/10 px-3 py-2.5 text-sm">
                <span>Julien Roche — Chaudière</span>
                <span className="font-mono text-[10px] text-steel">RDV 14h</span>
              </div>
              <div className="flex items-center justify-between border border-ink/10 px-3 py-2.5 text-sm opacity-60">
                <span>Amandine Roy — Tableau électrique</span>
                <span className="font-mono text-[10px] text-steel">Photos ajoutées</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Parcours() {
  const etapes = [
    { n: "01", titre: "Le client appelle", texte: "Par téléphone, SMS ou message — comme d'habitude." },
    { n: "02", titre: "Compyo crée le projet", texte: "Automatiquement, à partir du message ou en quelques secondes." },
    { n: "03", titre: "Tout se regroupe au même endroit", texte: "Photos, notes, notes vocales, échanges — plus rien ne se perd." },
    { n: "04", titre: "L'IA analyse les informations", texte: "Elle résume le besoin et repère ce qu'il manque encore." },
    { n: "05", titre: "Le devis est préparé", texte: "L'IA propose les postes, un moteur de calcul fixe les prix — jamais l'inverse." },
    { n: "06", titre: "Le planning est mis à jour", texte: "Rendez-vous et tâches liés au projet, visibles d'un coup d'œil." },
    { n: "07", titre: "Le chantier est suivi jusqu'au bout", texte: "Une chronologie complète, de l'appel à la fin des travaux." },
  ];

  return (
    <section id="parcours" className="bg-white border-y border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <SectionLabel>Comment ça marche</SectionLabel>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight max-w-lg">
          Le vrai parcours d&apos;un chantier, du premier appel à la fin des travaux.
        </h2>

        <div className="mt-14 max-w-2xl">
          {etapes.map((e, i) => (
            <div key={e.n} className="flex gap-5">
              <div className="flex flex-col items-center">
                <span className="shrink-0 grid place-items-center w-9 h-9 border border-ink/15 font-mono text-xs text-steel bg-paper">
                  {e.n}
                </span>
                {i < etapes.length - 1 && <span className="w-px flex-1 bg-ink/10 my-1" />}
              </div>
              <div className="pb-9">
                <h3 className="font-semibold text-sm">{e.titre}</h3>
                <p className="mt-1.5 text-sm text-ink/60 leading-relaxed">{e.texte}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Volontairement compact : le détail de chaque fonctionnalité est déjà
// raconté dans "Comment ça marche" juste au-dessus (dans l'ordre où
// l'artisan les rencontre). Les répéter ici avec une phrase d'explication
// chacune ferait doublon — ici, c'est la liste à parcourir en 3 secondes
// pour confirmer que rien ne manque.
function Fonctionnalites() {
  const items = [
    "Gestion des projets",
    "Analyse IA des demandes",
    "Devis assisté par IA",
    "Historique du chantier",
    "Planning intégré",
    "Notes vocales",
    "Photos de chantier",
    "Rappels intelligents",
  ];

  return (
    <section id="fonctionnalites" className="bg-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <SectionLabel>En un coup d&apos;œil</SectionLabel>
        <div className="flex flex-wrap gap-2.5">
          {items.map((f) => (
            <span
              key={f}
              className="text-sm text-ink/70 bg-white border border-ink/10 px-3.5 py-2"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Philosophie() {
  return (
    <section className="bg-ink">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-paper/50 mb-5">
          Notre philosophie
        </p>
        <p className="font-display text-2xl sm:text-3xl text-paper font-semibold leading-snug">
          L&apos;IA ne remplace jamais l&apos;artisan.
        </p>
        <p className="mt-5 text-paper/65 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
          Elle prépare, organise, résume et automatise les tâches administratives —
          jamais les décisions. Rien n&apos;est envoyé, planifié ou validé sans que
          vous l&apos;ayez d&apos;abord relu. Vous gardez toujours le contrôle.
        </p>
      </div>
    </section>
  );
}

function Differenciation() {
  const nonItems = [
    "Une simple IA qui invente des prix au hasard.",
    "Un simple logiciel de devis, isolé du reste du chantier.",
  ];

  return (
    <section className="bg-white border-y border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <SectionLabel>Pourquoi Compyo est différent</SectionLabel>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight max-w-lg">
          Un assistant qui suit le chantier, pas un générateur de documents.
        </h2>

        <div className="mt-12 grid sm:grid-cols-2 gap-8 max-w-3xl">
          <div className="border border-ink/10 p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink/40 mb-4">
              Ce que Compyo n&apos;est pas
            </p>
            <div className="flex flex-col gap-3">
              {nonItems.map((texte) => (
                <div key={texte} className="flex items-start gap-3">
                  <span className="mt-0.5 text-ink/30 shrink-0">✕</span>
                  <p className="text-sm text-ink/60">{texte}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-signal/30 bg-signal/[0.04] p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-signal mb-4">
              Ce que Compyo est
            </p>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-signal shrink-0">✓</span>
              <p className="text-sm text-ink/80">
                Un véritable assistant qui suit chaque chantier, du premier appel
                jusqu&apos;à la fin des travaux — le prix, lui, est toujours calculé par
                un moteur fixe, jamais deviné par l&apos;IA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeuilleDeRoute() {
  const aujourdhui = [
    "Gestion des projets",
    "Devis assisté par IA",
    "Planning intégré",
    "Notes vocales",
    "Photos de chantier",
    "Historique complet du chantier",
  ];
  const prochainement = [
    "Assistant téléphonique IA",
    "Synchronisation calendrier",
    "Intégration fournisseurs",
    "Assistant de suivi client",
  ];

  return (
    <section id="feuille-de-route" className="bg-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <SectionLabel>Feuille de route</SectionLabel>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight max-w-lg">
          Ce qui existe déjà, ce qui arrive ensuite.
        </h2>
        <p className="mt-4 text-sm text-ink/60 max-w-md">
          Construite avec les retours des artisans testeurs, pas devinée à l&apos;avance.
        </p>

        <div className="mt-12 grid sm:grid-cols-2 gap-8 max-w-3xl">
          <div className="border border-ink/10 bg-white p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-steel mb-4">
              Aujourd&apos;hui
            </p>
            <div className="flex flex-col gap-2.5">
              {aujourdhui.map((texte) => (
                <div key={texte} className="flex items-center gap-2.5 text-sm text-ink/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal shrink-0" />
                  {texte}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-ink/10 border-dashed bg-white/40 p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink/35 mb-4">
              Prochainement
            </p>
            <div className="flex flex-col gap-2.5">
              {prochainement.map((texte) => (
                <div key={texte} className="flex items-center gap-2.5 text-sm text-ink/50">
                  <span className="w-1.5 h-1.5 rounded-full border border-ink/25 shrink-0" />
                  {texte}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BetaPrivee() {
  return (
    <section className="bg-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-paper/50 mb-3">
          Bêta privée
        </p>
        <h2 className="font-display text-2xl sm:text-3xl text-paper font-semibold max-w-xl mx-auto leading-snug">
          Volontairement limitée à quelques artisans.
        </h2>
        <p className="mt-4 text-sm text-paper/60 max-w-lg mx-auto leading-relaxed">
          Pas par manque de moyens — par choix. Nous préférons construire le meilleur
          produit possible avec les retours d&apos;un petit nombre d&apos;artisans motivés,
          plutôt que de deviner ce qui leur manque. Chaque candidature est lue et
          examinée individuellement.
        </p>
        <Link
          href="/demander-acces"
          className="mt-8 inline-flex items-center justify-center gap-2 bg-signal text-white font-medium px-6 py-3.5 hover:bg-[#c15815] transition-colors"
        >
          Demander un accès
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink border-t border-white/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-7 h-7 bg-paper text-ink font-semibold text-xs">
            P
          </span>
          <span className="text-sm text-paper/70">Compyo — projet en cours de validation</span>
        </div>
        <p className="font-mono text-xs text-paper/40">compyo.saas@gmail.com</p>
      </div>
    </footer>
  );
}
